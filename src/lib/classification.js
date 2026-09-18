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

export function normalizeClassification(value) {
  const result = v.safeParse(resultSchema, value)
  if (!result.success) return { category: UNCLASSIFIED, quote: '' }
  return { category: result.output.category, quote: toQuote(result.output.quote) }
}

export async function requestClassification(input, fetcher = fetch) {
  const response = await fetcher('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(45000),
  })
  if (!response.ok) throw new Error('분류 요청에 실패했습니다. 다시 시도해 주세요.')
  return normalizeClassification(await response.json())
}
