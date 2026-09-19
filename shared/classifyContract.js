// 분류 요청·응답의 공유 계약. 브라우저와 서버가 각각 여기만 본다. (ADR 0016)
// fetch는 이 파일에 두지 않는다. 브라우저 어댑터(src/lib/classify.js)의 몫이다.
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

export function buildClassificationInput(item) {
  return { name: item.name, text: item.text.slice(0, MAX_TEXT_CHARS) }
}

// 서버와 브라우저가 각각 부른다. 2겹으로 막는다. (ADR 0009, 0016)
export function normalizeClassification(value) {
  const result = v.safeParse(resultSchema, value)
  if (!result.success) return { category: UNCLASSIFIED, quote: '' }
  return { category: result.output.category, quote: toQuote(result.output.quote) }
}
