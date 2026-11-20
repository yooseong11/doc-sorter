import ActionBar from '../common/ActionBar'
import Button from '../common/Button'
import Spinner from '../common/Spinner'

function UploadActionBar({
  count,
  reading,
  addDisabled,
  canClassify,
  classifying,
  onAdd,
  onClassify,
}) {
  return (
    <ActionBar
      actions={
        <>
          <Button variant="quiet" onClick={onAdd} disabled={addDisabled}>
            파일 더 넣기
          </Button>
          <Button onClick={onClassify} disabled={!canClassify} loading={classifying}>
            {classifying ? '분류하는 중…' : '분류 시작'}
          </Button>
        </>
      }
    >
      {reading ? (
        <span className="action-bar__loading">
          <Spinner />
          내용을 읽는 중입니다…
        </span>
      ) : (
        `${count}개 준비됨`
      )}
    </ActionBar>
  )
}

export default UploadActionBar
