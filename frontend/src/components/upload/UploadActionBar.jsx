import ActionBar from '../common/ActionBar'
import Button from '../common/Button'
import Spinner from '../common/Spinner'
import { hasBlockingIssue } from '../../../shared/categories.js'

function UploadActionBar({
  items,
  categories,
  directoryPickerStatus,
  classifying,
  onAdd,
  onClassify,
}) {
  const count = items.length
  const reading = items.some((item) => item.classification.phase === 'reading')
  // 이름이 비었거나 겹치면 서버 스키마가 400으로 막는다. 누르기 전에 막는다. (ADR 0020)
  const categoriesBlocked = hasBlockingIssue(categories)
  let classifyStatus = 'ready'
  if (classifying) classifyStatus = 'classifying'
  else if (directoryPickerStatus === 'unavailable') classifyStatus = 'unavailable'
  else if (count === 0) classifyStatus = 'empty'
  else if (reading) classifyStatus = 'reading'
  else if (categoriesBlocked) classifyStatus = 'categories-blocked'
  const addStatus =
    classifying ? 'classifying' : directoryPickerStatus === 'available' ? 'ready' : 'unavailable'

  return (
    <ActionBar
      actions={
        <>
          <Button variant="quiet" onClick={onAdd} disabled={addStatus !== 'ready'}>
            파일 더 넣기
          </Button>
          <Button
            onClick={onClassify}
            disabled={classifyStatus !== 'ready'}
            loading={classifyStatus === 'classifying'}
          >
            {classifyStatus === 'classifying' ? '분류하는 중…' : '분류 시작'}
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
