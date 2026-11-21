import ActionBar from '../common/ActionBar'
import Button from '../common/Button'
import { SAVE_PHASE } from '../../lib/state/savePhases'

function SaveActionBar({
  phase,
  failedCount,
  canSave,
  count,
  onRetry,
  onRestart,
  onBack,
  onSave,
}) {
  const done = phase === 'done'

  return (
    <ActionBar
      actions={
        done ? (
          <>
            {failedCount > 0 && (
              <Button variant="quiet" onClick={onRetry}>
                실패분 다시 시도
              </Button>
            )}
            <Button onClick={onRestart}>새 파일 분류하기</Button>
          </>
        ) : (
          <>
            <Button
              variant="quiet"
              onClick={onBack}
              disabled={phase === SAVE_PHASE.SAVING}
            >
              확인 화면으로
            </Button>
            <Button
              onClick={onSave}
              disabled={phase === SAVE_PHASE.SAVING || !canSave}
            >
              저장 시작
            </Button>
          </>
        )
      }
    >
      {count}
    </ActionBar>
  )
}

export default SaveActionBar
