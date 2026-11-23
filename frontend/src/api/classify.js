// 브라우저 어댑터. /api/classify만 알고, 계약은 shared에서 가져온다. (ADR 0016)
// 서버 응답을 화면에 반영하기 전에 검사한다. (ADR 0016)
import { normalizeClassification } from '../../shared/classifyContract.js'
import { categoryPreset, UNCLASSIFIED } from '../../shared/categories.js'
import { send } from './send.js'

// preset은 이번 분류에 실제로 쓴, id가 붙은 전체 프리셋이다. 요청 계약(input.categories)엔
// id가 없으므로 서버 응답을 받은 뒤 여기서 이름→id로 바꾼다. 없는 이름은 미분류다. (ADR 0022)
export async function requestClassification(input, preset, fetcher = fetch) {
  const body = await send('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(45000),
  }, fetcher)
  // 이번 요청에 실어 보낸 목록으로 검사한다. 요청이 곧 정답지다. (ADR 0019)
  const { category, quote } = normalizeClassification(body, input.text, categoryPreset(input.categories))
  const categoryId = preset?.categories.find((item) => item.name === category)?.id ?? UNCLASSIFIED
  return { categoryId, quote }
}
