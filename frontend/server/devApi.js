import { createHandler } from '../api/classify.js'
import { createClassifier } from './classifier.js'

// 개발에서도 배포와 같은 핸들러를 사용한다. 환경 변수는 브라우저로 노출하지 않는다.
export function devApi(env) {
  const handler = createHandler(() => createClassifier(env))
  return {
    name: 'local-classification-api',
    configureServer(server) {
      server.middlewares.use('/api/classify', async (req, res) => {
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
        let body = ''
        try {
          for await (const chunk of req) {
            body += chunk
            if (Buffer.byteLength(body) > 32768) return res.status(413).json({ error: '요청이 너무 큽니다.' })
          }
          req.body = body
          await handler(req, res)
        } catch {
          if (!res.writableEnded) res.status(400).json({ error: '요청을 읽지 못했습니다.' })
        }
      })
    },
  }
}
