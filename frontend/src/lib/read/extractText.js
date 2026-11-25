import { requestOcr } from '../../api/ocr.js'
import { extensionOf } from './fileKind.js'
import { MAX_TEXT_CHARS } from '../../../shared/classifyContract.js'

// PDF·이미지는 로컬 OCR API, DOCX·HWPX는 브라우저 추출기를 사용한다. (ADR 0007)
export const extractors = {
  pdf: requestOcr,
  png: requestOcr,
  jpg: requestOcr,
  jpeg: requestOcr,
  docx: async (file) => (await import('./docx.js')).extractDocxText(file),
  hwpx: async (file) => (await import('./hwpx.js')).extractHwpxText(file),
}
export async function extractText(file, readers = extractors) {
  const reader = readers[extensionOf(file.name)]
  if (!reader) return { text: '', readable: false, reason: 'unsupported-format' }
  const result = await reader(file)
  const text = (typeof result === 'string' ? result : result.text).trim().slice(0, MAX_TEXT_CHARS)
  // 공백을 제외한 문자가 10자 미만이면 분류 근거가 부족하다고 본다.
  return { ...(typeof result === 'object' ? { ocr: result.ocr } : {}), text, readable: text.replace(/\s/g, '').length >= 10, reason: text.replace(/\s/g, '').length < 10 ? 'empty-text' : null }
}
