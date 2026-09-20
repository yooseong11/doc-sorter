// 브라우저 어댑터. /api/classify만 알고, 계약은 shared에서 가져온다. (ADR 0016)
// 서버가 이미 normalize했지만 응답을 한 겹 더 막는다. 서버도 틀릴 수 있다. (ADR 0009)
import { normalizeClassification } from '../../../shared/classifyContract.js'

export async function requestClassification(input, fetcher = fetch) {
  const response = await fetcher('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(45000),
  })
  if (!response.ok) throw new Error('분류 요청에 실패했습니다. 다시 시도해 주세요.')
  return normalizeClassification(await response.json(), input.text)
}
