// 브라우저 어댑터. /api/classify만 알고, 계약은 shared에서 가져온다. (ADR 0016)
// 서버 응답을 화면에 반영하기 전에 검사한다. (ADR 0016)
import { normalizeClassification } from '../../shared/classifyContract.js'
import { categoryPreset, UNCLASSIFIED } from '../../shared/categories.js'
import { send } from './send.js'

/**
 * 서버가 반환하는 분류 응답의 계약. 실제 응답은 변환 함수에서 검증한다.
 * @typedef {Object} ClassificationResponseDto
 * @property {string} category 카테고리 이름
 * @property {string} quote 원문에서 인용한 근거 문장
 */

/**
 * 화면에서 사용하는 분류 결과.
 * @typedef {Object} ClassificationResult
 * @property {string} categoryId 프리셋의 카테고리 ID 또는 미분류
 * @property {string} quote 검증·보정된 근거 문장
 */

/**
 * 서버 응답을 검증·보정하고 화면용 결과로 변환한다.
 * @param {unknown} responseDto ClassificationResponseDto 계약을 기대하는 미검증 응답
 * @param {Object} input 이번 요청에 보낸 텍스트와 카테고리
 * @param {Object} preset 이번 분류에 사용한 ID가 있는 전체 프리셋
 * @returns {ClassificationResult}
 */
function toClassificationResult(responseDto, input, preset) {
  // 이번 요청에 실어 보낸 목록으로 검사한다. 요청이 곧 정답지다. (ADR 0019)
  const { category, quote } = normalizeClassification(responseDto, input.text, categoryPreset(input.categories))
  // 서버는 이름으로 답하므로 프리셋의 ID로 바꾼다. 없는 이름은 미분류다. (ADR 0022)
  const categoryId = preset?.categories.find((item) => item.name === category)?.id ?? UNCLASSIFIED
  return { categoryId, quote }
}

/** @returns {Promise<ClassificationResult>} */
export async function requestClassification(input, preset, fetcher = fetch) {
  const responseDto = await send('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(45000),
  }, fetcher)
  return toClassificationResult(responseDto, input, preset)
}
