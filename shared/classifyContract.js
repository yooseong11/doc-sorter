// 분류 요청·응답의 공유 계약. 브라우저와 서버가 각각 여기만 본다. (ADR 0016)
// fetch는 이 파일에 두지 않는다. 브라우저 어댑터(src/lib/classify/classify.js)의 몫이다.
import * as v from 'valibot'
import { DEFAULT_CATEGORIES, UNCLASSIFIED, categoryPreset } from './categories.js'

export const MAX_TEXT_CHARS = 3000
// 인용문은 원문 문장 그대로다. 응답과 화면에 본문이 길게 실리지 않게 상한을 둔다. (ADR 0015)
export const MAX_QUOTE_CHARS = 120
// 이름과 설명은 그대로 분류 프롬프트에 들어간다. 이 상한이 곧 요청 비용이다. (ADR 0019)
export const MAX_CATEGORY_NAME_CHARS = 20
export const MAX_CATEGORY_HINT_CHARS = 60
export const MAX_CATEGORIES = 8

const categorySchema = v.strictObject({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1),
    v.maxLength(MAX_CATEGORY_NAME_CHARS),
    // 미분류는 편집 대상이 아니라 프리셋이 항상 맨 뒤에 붙인다. 중복으로 들어오면 안 된다. (ADR 0014)
    v.check((name) => name !== UNCLASSIFIED, '미분류는 카테고리로 넣을 수 없습니다.'),
  ),
  hint: v.pipe(v.string(), v.trim(), v.maxLength(MAX_CATEGORY_HINT_CHARS)),
})

const categoriesSchema = v.pipe(
  v.array(categorySchema),
  v.minLength(1),
  v.maxLength(MAX_CATEGORIES),
  // 이름이 겹치면 모델이 고른 카테고리를 하나로 정할 수 없다.
  v.check((list) => new Set(list.map((category) => category.name)).size === list.length, '카테고리 이름이 겹칩니다.'),
)

// categories는 선택이 아니라 필수다. 없으면 서버가 무엇으로 분류했는지 화면과 어긋난다. (ADR 0019)
export const inputSchema = v.strictObject({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
  text: v.pipe(v.string(), v.minLength(1), v.maxLength(MAX_TEXT_CHARS)),
  categories: categoriesSchema,
})

// 카테고리가 요청마다 달라지므로 스키마도 요청마다 만든다. 모듈 로드 시점에 굳히지 않는다. (ADR 0019)
// 인용문은 스키마 검증에서 빼고 따로 다듬는다. 값이 이상해도 카테고리는 살아남는다. (ADR 0015)
function resultSchemaOf(options) {
  return v.strictObject({ category: v.picklist(options), quote: v.optional(v.unknown()) })
}

export function toQuote(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_QUOTE_CHARS) : ''
}

// PDF는 글자 조각을 공백으로 이어 붙이므로 원문의 공백을 믿을 수 없다.
// 한글은 자모 결합 방식이 두 가지라 NFC로 맞춘 뒤 공백을 모두 지우고 비교한다. (ADR 0018)
export function stripSpaces(value) {
  return value.normalize('NFC').replace(/\s+/g, '')
}

// 지어낸 문장을 근거로 보여주지 않으려고 원문에 있는지 확인한다. 원문이 없으면 확인할 수 없으니 버린다. (ADR 0018)
export function quoteInText(quote, text) {
  const needle = stripSpaces(quote)
  return needle.length > 0 && stripSpaces(text).includes(needle)
}

// 편집 화면이 붙일 id 같은 여분 필드는 계약에 싣지 않는다. 이름과 설명만 보낸다. (ADR 0008)
export function buildClassificationInput(item, categories = DEFAULT_CATEGORIES) {
  return {
    name: item.source.name,
    text: item.classification.text.slice(0, MAX_TEXT_CHARS),
    categories: categories.map(({ name, hint }) => ({ name, hint })),
  }
}

// 서버와 브라우저가 각각 부른다. 2겹으로 막는다. (ADR 0009, 0016)
// text는 모델에 보낸 원문이다. 넘기지 않으면 인용문을 확인할 수 없어 비운다. (ADR 0018)
// preset은 이 요청에 쓴 카테고리다. 넘기지 않으면 기본 프리셋으로 본다. (ADR 0019)
export function normalizeClassification(value, text = '', preset = categoryPreset()) {
  const result = v.safeParse(resultSchemaOf(preset.options), value)
  if (!result.success) return { category: UNCLASSIFIED, quote: '' }
  const quote = toQuote(result.output.quote)
  return { category: result.output.category, quote: quoteInText(quote, text) ? quote : '' }
}
