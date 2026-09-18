import * as v from 'valibot'
import { CATEGORY_OPTIONS, UNCLASSIFIED } from './categories.js'

export const MAX_TEXT_CHARS = 6000
export const inputSchema = v.strictObject({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
  text: v.pipe(v.string(), v.minLength(1), v.maxLength(MAX_TEXT_CHARS)),
})
const resultSchema = v.strictObject({ category: v.picklist(CATEGORY_OPTIONS) })

export function buildClassificationInput(item) {
  return { name: item.name, text: item.text.slice(0, MAX_TEXT_CHARS) }
}

export function normalizeClassification(value) {
  const result = v.safeParse(resultSchema, value)
  return { category: result.success ? result.output.category : UNCLASSIFIED, quote: '' }
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
