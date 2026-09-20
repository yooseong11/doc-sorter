// 분류 요청·응답의 공유 계약. 브라우저와 서버가 각각 여기만 본다. (ADR 0016)
// fetch는 이 파일에 두지 않는다. 브라우저 어댑터(src/lib/classify/classify.js)의 몫이다.
import * as v from 'valibot'
import { CATEGORY_OPTIONS, UNCLASSIFIED } from './categories.js'

export const MAX_TEXT_CHARS = 6000
// 인용문은 원문 문장 그대로다. 응답과 화면에 본문이 길게 실리지 않게 상한을 둔다. (ADR 0015)
export const MAX_QUOTE_CHARS = 120
export const inputSchema = v.strictObject({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
  text: v.pipe(v.string(), v.minLength(1), v.maxLength(MAX_TEXT_CHARS)),
})
// 인용문은 스키마 검증에서 빼고 따로 다듬는다. 값이 이상해도 카테고리는 살아남는다. (ADR 0015)
const resultSchema = v.strictObject({ category: v.picklist(CATEGORY_OPTIONS), quote: v.optional(v.unknown()) })

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

export function buildClassificationInput(item) {
  return {
    name: item.source.name,
    text: item.classification.text.slice(0, MAX_TEXT_CHARS),
  }
}

// 서버와 브라우저가 각각 부른다. 2겹으로 막는다. (ADR 0009, 0016)
// text는 모델에 보낸 원문이다. 넘기지 않으면 인용문을 확인할 수 없어 비운다. (ADR 0018)
export function normalizeClassification(value, text = '') {
  const result = v.safeParse(resultSchema, value)
  if (!result.success) return { category: UNCLASSIFIED, quote: '' }
  const quote = toQuote(result.output.quote)
  return { category: result.output.category, quote: quoteInText(quote, text) ? quote : '' }
}
