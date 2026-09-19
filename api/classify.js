import * as v from 'valibot'
import { inputSchema } from '../shared/classifyContract.js'
import { createClassifier } from '../server/classifier.js'

export function createHandler(getClassifier = () => createClassifier(process.env)) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'POST 요청만 지원합니다.' })
    }
    let body = req.body
    try { if (typeof body === 'string') body = JSON.parse(body) } catch {
      return res.status(400).json({ error: '잘못된 JSON입니다.' })
    }
    const input = v.safeParse(inputSchema, body)
    if (!input.success) return res.status(400).json({ error: '파일명과 앞부분 텍스트를 확인해 주세요.' })
    try {
      const result = await getClassifier()(input.output)
      // 인용문은 올려보낸 앞부분 텍스트에서 나온 문장이다. 길이는 normalizeClassification이 자른다. (ADR 0015)
      return res.status(200).json({ category: result.category, quote: result.quote })
    } catch {
      return res.status(502).json({ error: '분류하지 못했습니다. 서버 설정 또는 연결을 확인해 주세요.' })
    }
  }
}
export default createHandler()
