import { extensionOf } from './fileKind.js'
import { MAX_TEXT_CHARS } from './classification.js'

// R1은 PDF·DOCX. HWPX 추출기는 R2에서 추가한다.
export const extractors = {
  pdf: async (file) => (await import('./extractors/pdf.js')).extractPdfText(file),
  docx: async (file) => (await import('./extractors/docx.js')).extractDocxText(file),
}
export async function extractText(file, readers = extractors) {
  const reader = readers[extensionOf(file.name)]
  if (!reader) return { text: '', readable: false, reason: 'unsupported-format' }
  const text = (await reader(file)).trim().slice(0, MAX_TEXT_CHARS)
  // 공백을 제외한 문자가 10자 미만이면 분류 근거가 부족하다고 본다.
  return { text, readable: text.replace(/\s/g, '').length >= 10, reason: text.replace(/\s/g, '').length < 10 ? 'empty-text' : null }
}
