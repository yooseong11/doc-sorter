import test from 'node:test'
import assert from 'node:assert/strict'
import { requestOcr } from '../src/api/ocr.js'
import { extractText } from '../src/lib/read/extractText.js'
import { isAccepted } from '../src/lib/read/acceptedFiles.js'
import { isReadable } from '../src/lib/read/fileKind.js'

function response(status = 'partial') {
  return {
    processing_id: 'processing-id', text: '한글 English 문서 본문입니다',
    files: { txt: 'processing-id/문서.txt', json: 'processing-id/문서.json' },
    result: { status, pages: [
      { page: 1, method: 'ocr', warnings: [], words: [{ needs_review: true }, { needs_review: false }] },
      { page: 2, method: 'error', warnings: ['timeout'], words: [] },
    ] },
  }
}

test('이미지 선택과 PDF·이미지 읽기를 허용한다', () => {
  for (const name of ['scan.PNG', 'scan.jpg', 'scan.jpeg', 'mixed.pdf']) {
    assert.equal(isAccepted({ name }), true)
    assert.equal(isReadable(name), true)
  }
})

test('OCR는 FormData로 전송하고 부분 실패·검토 정보를 보존한다', async () => {
  const file = new File(['image'], 'scan.png', { type: 'image/png' })
  const result = await requestOcr(file, async (path, options) => {
    assert.equal(path, '/api/ocr')
    assert.equal(options.body.get('file').name, 'scan.png')
    assert.equal(options.headers, undefined)
    return new Response(JSON.stringify(response()))
  })
  assert.equal(result.ocr.reviewWords, 1)
  assert.deepEqual(result.ocr.failedPages, [2])
  assert.equal(result.ocr.files.json, 'processing-id/문서.json')
})

test('분류 텍스트만 자르고 저장 결과의 식별자는 유지한다', async () => {
  const result = await extractText({ name: 'scan.png' }, {
    png: async () => ({ text: '한글'.repeat(3000), ocr: { processingId: 'saved' } }),
  })
  assert.equal(result.text.length, 3000)
  assert.equal(result.ocr.processingId, 'saved')
  assert.equal(result.readable, true)
})

test('실패·잘못된 OCR 응답·업로드 제한을 오류로 처리한다', async () => {
  const file = new File(['x'], 'scan.png')
  await assert.rejects(requestOcr(file, async () => new Response(JSON.stringify(response('failed')))), /모든 PDF 페이지/)
  await assert.rejects(requestOcr(file, async () => new Response('{}')), /응답 형식/)
  await assert.rejects(requestOcr(file, async () => new Response(JSON.stringify({ detail: { message: '암호화된 PDF는 지원하지 않습니다.' } }), { status: 422 })), /암호화된 PDF/)
  await assert.rejects(requestOcr({ size: 26 * 1024 * 1024 }), /25MB/)
})

test('네트워크 오류·타임아웃·취소를 구분한다', async () => {
  const file = new File(['x'], 'scan.png')
  await assert.rejects(requestOcr(file, async () => { throw new Error('network') }), /연결하지 못했습니다/)
  await assert.rejects(requestOcr(file, async () => { throw new DOMException('timeout', 'TimeoutError') }), /시간이 초과/)
  await assert.rejects(requestOcr(file, async () => { throw new DOMException('aborted', 'AbortError') }), { name: 'AbortError' })
})
