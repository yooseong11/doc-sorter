import './StatusBadge.css'
import { CLASSIFICATION_PHASE } from '../../lib/state/classificationPhases'
import { SAVE_PHASE } from '../../lib/state/savePhases'

// 파일별 상태 (ADR 0013): 대기 → 읽는 중 → 분류 중 → 분류됨 / 실패
// 저장 화면(S3)의 저장 중·저장됨도 같은 배지를 쓴다. (ADR 0011)
const LABELS = {
  waiting: '대기',
  reading: '읽는 중',
  classifying: '분류 중',
  classified: '분류됨',
  saving: '저장 중',
  saved: '저장됨',
  failed: '실패',
  unreadable: '읽을 수 없음',
}

const LOADING = [CLASSIFICATION_PHASE.READING, CLASSIFICATION_PHASE.CLASSIFYING, SAVE_PHASE.SAVING]

function StatusBadge({ status, title }) {
  const loading = LOADING.includes(status)

  return (
    <span
      className={`status-badge status-badge--${status}`}
      title={title}
      aria-live={loading ? 'polite' : undefined}
    >
      {loading && <span className="status-badge__spinner" aria-hidden="true" />}
      {LABELS[status] ?? status}
    </span>
  )
}

export default StatusBadge
