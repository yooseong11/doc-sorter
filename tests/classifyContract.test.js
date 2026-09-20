import test from 'node:test'
import assert from 'node:assert/strict'
import { buildClassificationInput, normalizeClassification, quoteInText, MAX_TEXT_CHARS, MAX_QUOTE_CHARS } from '../shared/classifyContract.js'
import { requestClassification } from '../src/lib/classify/classify.js'
import { createDocument, documentsReducer } from '../src/lib/state/documentsReducer.js'
import { classifyDocuments, prepareDocument } from '../src/lib/state/runDocuments.js'
import { extractText } from '../src/lib/read/extractText.js'
import { createClassifier, readAIConfig } from '../server/classifier.js'
import { createHandler } from '../api/classify.js'

// 요청에 실어 보내는 카테고리. 기본값과 다른 목록으로 두어 하드코딩을 잡는다. (ADR 0019)
const categories = [{ name: '계약서', hint: '용역·근로 계약, NDA' }, { name: '세금 신고', hint: '부가세, 원천세' }]

// 읽기까지 끝나 분류 대기 중인 문서. (ADR 0013)
const document = (id, over = {}) => {
  const item = createDocument({ name: `${id}.pdf`, size: 10 }, id)
  return {
    ...item,
    classification: { ...item.classification, phase: 'ready', text: '분류할 문서 내용입니다.', ...over },
  }
}

test('전송 데이터에는 이름과 제한된 앞부분, 이번에 쓸 카테고리만 포함한다', () => {
  const input = buildClassificationInput(document('a', { text: '가'.repeat(10000) }))
  assert.deepEqual(Object.keys(input), ['name', 'text', 'categories'])
  assert.equal(input.text.length, MAX_TEXT_CHARS)
  // 편집 화면이 붙일 id 같은 여분 필드는 싣지 않는다. (ADR 0008, 0019)
  const withId = buildClassificationInput(document('a'), [{ name: '세금 신고', hint: '부가세', id: 'x' }])
  assert.deepEqual(withId.categories, [{ name: '세금 신고', hint: '부가세' }])
})
test('잘못된 응답과 없는 카테고리는 미분류가 된다', () => {
  for (const value of [null, {}, { category: '없는 분류' }, { category: '계약서', extra: true }]) {
    assert.equal(normalizeClassification(value).category, '미분류')
  }
  assert.equal(normalizeClassification({ category: '계약서' }).category, '계약서')
})
test('인용문은 상한까지 자르고 값이 이상하면 카테고리만 살린다', () => {
  assert.equal(normalizeClassification({ category: '계약서', quote: '가'.repeat(300) }, '가'.repeat(300)).quote.length, MAX_QUOTE_CHARS)
  assert.equal(normalizeClassification({ category: '계약서', quote: '  근거 문장  ' }, '이것은 근거 문장입니다').quote, '근거 문장')
  assert.equal(normalizeClassification({ category: '계약서' }, '원문').quote, '')
  for (const value of [null, 42, { text: '근거' }]) {
    const result = normalizeClassification({ category: '계약서', quote: value }, '원문')
    assert.equal(result.category, '계약서')
    assert.equal(result.quote, '')
  }
})
test('원문에 없는 인용문은 비우고 공백 차이는 같은 문장으로 본다', () => {
  // PDF 추출은 글자 조각을 공백으로 이어 붙인다. 공백만 다른 것은 같은 문장이다. (ADR 0018)
  assert.equal(quoteInText('갑과 을은 다음과 같이 계약한다', '제1조 갑 과  을은\n다음과같이 계약한다.'), true)
  assert.equal(quoteInText('연차 사용을 승인한다', '갑과 을은 다음과 같이 계약한다'), false)
  assert.equal(quoteInText('   ', '원문'), false)
  // 지어낸 문장은 카테고리만 남기고 버린다.
  const made = normalizeClassification({ category: '계약서', quote: '모델이 지어낸 문장' }, '갑과 을은 다음과 같이 계약한다')
  assert.equal(made.category, '계약서')
  assert.equal(made.quote, '')
  // 원문을 넘기지 않으면 확인할 수 없으므로 비운다.
  assert.equal(normalizeClassification({ category: '계약서', quote: '근거 문장' }).quote, '')
})
test('파일별 실패를 격리하고 미지원 파일은 API를 호출하지 않는다', async () => {
  let rows = [document('a'), document('b'), document('c', { readable: false })]
  const calls = []
  const dispatch = (action) => { rows = documentsReducer(rows, action) }
  await classifyDocuments(rows, { dispatch, classify: async (input) => {
    calls.push(input.name)
    if (input.name === 'a.pdf') throw new Error('network')
    return { category: '계약서' }
  } })
  assert.deepEqual(calls, ['a.pdf', 'b.pdf'])
  assert.deepEqual(rows.map((row) => row.classification.phase), ['classify-failed', 'classified', 'classified'])
  rows = documentsReducer(rows, { type: 'category', id: 'b', category: '근태' })
  await classifyDocuments(rows, { dispatch, retry: true, classify: async (input) => {
    calls.push(input.name)
    return { category: '복지 신청' }
  } })
  assert.deepEqual(calls, ['a.pdf', 'b.pdf', 'a.pdf'])
  assert.equal(rows[1].classification.category, '근태')
})
test('삭제한 파일은 늦게 끝난 추출 결과로 돌아오지 않는다', async () => {
  let rows = [document('a')]
  const dispatch = (action) => { rows = documentsReducer(rows, action) }
  let finish
  const pending = prepareDocument(rows[0], { dispatch, extract: () => new Promise((resolve) => { finish = resolve }) })
  dispatch({ type: 'remove', id: 'a' })
  finish({ text: '내용', readable: true })
  await pending
  assert.deepEqual(rows, [])
})
test('읽기 실패 재시도는 파일부터 다시 읽는다', async () => {
  let rows = [document('a')]
  const dispatch = (action) => { rows = documentsReducer(rows, action) }
  await prepareDocument(rows[0], { dispatch, extract: async () => { throw new Error('corrupt') } })
  assert.equal(rows[0].classification.phase, 'read-failed')
  await classifyDocuments(rows, { dispatch, retry: true, extract: async () => ({ readable: true, text: '복구된 문서의 내용입니다.' }), classify: async () => ({ category: '계약서' }) })
  assert.equal(rows[0].classification.phase, 'classified')
})
test('미지원 형식과 텍스트 부족은 읽을 수 없음으로 반환한다', async () => {
  assert.equal((await extractText({ name: 'a.hwp' }, {})).reason, 'unsupported-format')
  assert.equal((await extractText({ name: 'a.PDF' }, { pdf: async () => ' \n ' })).reason, 'empty-text')
  assert.equal((await extractText({ name: 'a.PDF' }, { pdf: async () => '문서의 내용을 충분히 읽었습니다.' })).readable, true)
})
test('클라이언트는 자체 API를 호출하고 HTTP 오류를 실패로 처리한다', async () => {
  const input = { name: 'a.pdf', text: '내용' }
  const result = await requestClassification(input, async (url, options) => {
    assert.equal(url, '/api/classify')
    assert.deepEqual(JSON.parse(options.body), input)
    return { ok: true, json: async () => ({ category: '계약서' }) }
  })
  assert.equal(result.category, '계약서')
  await assert.rejects(requestClassification(input, async () => ({ ok: false })))
})
test('환경 변수로 제공자 주소·모델·키를 바꾸며 자동 재시도하지 않는다', async () => {
  let options, payload
  class Client {
    constructor(value) {
      options = value
      this.chat = { completions: { create: async (input) => {
        payload = input
        return { choices: [{ finish_reason: 'stop', message: { content: '{"category":"계약서"}' } }] }
      } } }
    }
  }
  const classify = createClassifier({ AI_PROVIDER: 'openai-compatible', AI_BASE_URL: 'https://example.com/v1', AI_MODEL: 'custom', AI_API_KEY: 'test-key' }, Client)
  assert.equal((await classify({ name: 'a', text: '내용' })).category, '계약서')
  assert.equal(options.baseURL, 'https://example.com/v1')
  assert.equal(options.maxRetries, 0)
  assert.equal(payload.model, 'custom')
  assert.equal(payload.response_format.json_schema.strict, true)
  // 근거 인용문도 같이 받는다. (ADR 0015)
  assert.deepEqual(payload.response_format.json_schema.schema.required, ['category', 'quote'])
  assert.throws(() => readAIConfig({ AI_PROVIDER: 'unknown' }))
  assert.throws(() => readAIConfig({}))
})
test('DeepSeek은 기본 주소를 쓰고 추론 모드를 끈 채로 json_object를 요청한다', async () => {
  let options, payload
  class Client {
    constructor(value) {
      options = value
      this.chat = { completions: { create: async (input) => {
        payload = input
        return { choices: [{ finish_reason: 'stop', message: { content: '{"category":"근태","quote":"연차 사용 신청서"}' } }] }
      } } }
    }
  }
  const classify = createClassifier({ AI_PROVIDER: 'deepseek', AI_MODEL: 'deepseek-flash', AI_API_KEY: 'test-key' }, Client)
  // 인용문 확인은 보낸 원문과 대조한다. (ADR 0018)
  const classified = await classify({ name: 'a', text: '연차 사용 신청서를 제출합니다.' })
  assert.equal(classified.category, '근태')
  assert.equal(classified.quote, '연차 사용 신청서')
  // 인용문 몫까지 출력 한도를 잡아 둔다. (ADR 0015)
  assert.ok(payload.max_tokens >= 400)
  assert.equal(options.baseURL, 'https://api.deepseek.com/v1')
  // DeepSeek은 strict json_schema를 400으로 거부한다.
  assert.equal(payload.response_format.type, 'json_object')
  // 추론 모드가 켜지면 추론 토큰만 수백 개가 나가고 출력이 잘린다.
  assert.deepEqual(payload.thinking, { type: 'disabled' })
  assert.ok(Number.isInteger(payload.max_tokens))
  // json_object는 "json"이라는 단어와 형식 예시를 요구한다.
  assert.match(payload.messages[0].content, /json/)
  assert.match(payload.messages[0].content, /quote/)
})
test('API는 메서드·입력 검증을 먼저 하며 내부 오류를 노출하지 않는다', async () => {
  let calls = 0
  const handler = createHandler(() => async () => { calls++; throw new Error('secret-api-key') })
  async function invoke(method, body) {
    const res = { setHeader() {}, status(code) { this.code = code; return this }, json(value) { this.body = value; return this } }
    await handler({ method, body }, res)
    return res
  }
  assert.equal((await invoke('GET')).code, 405)
  assert.equal((await invoke('POST', '{')).code, 400)
  assert.equal((await invoke('POST', { name: 'a', text: 'x'.repeat(6001), categories })).code, 400)
  assert.equal((await invoke('POST', { name: 'a', text: 'ok', categories, file: 'raw' })).code, 400)
  // 카테고리를 안 실으면 거절한다. 기본값으로 대신 분류하지 않는다. (ADR 0019)
  assert.equal((await invoke('POST', { name: 'a', text: 'ok' })).code, 400)
  assert.equal(calls, 0)
  const result = await invoke('POST', { name: 'a', text: 'ok', categories })
  assert.equal(result.code, 502)
  assert.ok(!JSON.stringify(result.body).includes('secret-api-key'))
})
test('API 응답에는 카테고리와 근거 인용문만 담긴다', async () => {
  const handler = createHandler(() => async () => ({ category: '계약서', quote: '갑과 을은 다음과 같이 계약한다', internal: 'secret' }))
  const res = { setHeader() {}, status(code) { this.code = code; return this }, json(value) { this.body = value; return this } }
  await handler({ method: 'POST', body: { name: 'a.pdf', text: '내용', categories } }, res)
  assert.equal(res.code, 200)
  assert.deepEqual(res.body, { category: '계약서', quote: '갑과 을은 다음과 같이 계약한다' })
})
