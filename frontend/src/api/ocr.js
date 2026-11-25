import * as v from 'valibot'
import { send, ApiError } from './send.js'

// 전체 텍스트와 좌표는 백엔드에 저장하고, 브라우저에는 분류용 텍스트와 검토 요약을 보관한다.
const responseSchema = v.object({
  processing_id: v.string(),
  text: v.string(),
  files: v.object({ txt: v.string(), json: v.string() }),
  result: v.object({
    status: v.picklist(['completed', 'partial', 'failed']),
    pages: v.array(v.object({
      page: v.number(),
      method: v.picklist(['ocr', 'direct', 'error']),
      warnings: v.array(v.string()),
      words: v.array(v.object({ needs_review: v.boolean() })),
    })),
  }),
})

export async function requestOcr(file, fetcher = fetch, signal = AbortSignal.timeout(330000)) {
  if (file.size > 25 * 1024 * 1024) throw new ApiError('OCR 파일은 25MB까지 선택할 수 있습니다.', 413)
  const body = new FormData()
  body.append('file', file)
  const response = await send('/api/ocr', { method: 'POST', body, signal }, fetcher)
  const parsed = v.safeParse(responseSchema, response)
  if (!parsed.success) throw new ApiError('OCR 서버 응답 형식이 올바르지 않습니다.')
  const data = parsed.output
  if (data.result.status === 'failed') throw new ApiError('모든 PDF 페이지를 읽지 못했습니다. 파일과 OCR 설정을 확인해 주세요.')
  return {
    text: data.text,
    ocr: {
      processingId: data.processing_id,
      files: data.files,
      status: data.result.status,
      reviewWords: data.result.pages.reduce((count, page) => count + page.words.filter((word) => word.needs_review).length, 0),
      failedPages: data.result.pages.filter((page) => page.method === 'error').map((page) => page.page),
      warnings: data.result.pages.flatMap((page) => page.warnings),
    },
  }
}
