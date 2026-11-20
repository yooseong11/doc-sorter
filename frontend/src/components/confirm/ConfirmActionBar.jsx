import ActionBar from '../common/ActionBar'
import Button from '../common/Button'

function ConfirmActionBar({ reviewCount, busy, onBack, onNext }) {
  return (
    <ActionBar
      actions={
        <>
          <Button variant="quiet" onClick={onBack} disabled={busy}>
            파일 다시 고르기
          </Button>
          <Button onClick={onNext} disabled={busy}>
            저장할 폴더 고르기
          </Button>
        </>
      }
    >
      {reviewCount > 0
        ? `확인이 필요한 파일이 ${reviewCount}개 있습니다`
        : '모두 확인했습니다'}
    </ActionBar>
  )
}

export default ConfirmActionBar
