import { extensionOf } from './fileKind.js'
import { MAX_TEXT_CHARS } from '../../../shared/classifyContract.js'

// 확장자마다 추출기를 하나씩 둔다. 지연 로드라 안 쓰는 라이브러리는 내려받지 않는다. (ADR 0007)
export const extractors = {
  pdf: async (file) => (await import('./pdf.js')).extractPdfText(file),
  docx: async (file) => (await import('./docx.js')).extractDocxText(file),
  hwpx: async (file) => (await import('./hwpx.js')).extractHwpxText(file),
}
export async function extractText(file, readers = extractors) {
  const reader = readers[extensionOf(file.name)]
  if (!reader) return { text: '', readable: false, reason: 'unsupported-format' }
  const text = (await reader(file)).trim().slice(0, MAX_TEXT_CHARS)
  // 공백을 제외한 문자가 10자 미만이면 분류 근거가 부족하다고 본다.
  return { text, readable: text.replace(/\s/g, '').length >= 10, reason: text.replace(/\s/g, '').length < 10 ? 'empty-text' : null }
}
