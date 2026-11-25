import { useRef } from 'react'
import PageShell from '../components/common/PageShell'
import PageHeader from '../components/common/PageHeader'
import InlineNotice from '../components/common/InlineNotice'
import AddFilesPanel from '../components/upload/AddFilesPanel'
import UploadFlow from '../components/upload/UploadFlow'
import UploadActionBar from '../components/upload/UploadActionBar'
import CategoryEditor from '../components/upload/CategoryEditor'
import { createDocument } from '../lib/state/documentsReducer'
import { prepareDocument } from '../lib/state/runDocuments'
import { supportsDirectoryPicker } from '../lib/save/saveFolder'

// 폴더 선택 API가 없으면 첫 화면에서 막는다. (ADR 0012)
// 브라우저 이름이 아니라 기능이 있는지로 판단한다.
const CAN_PICK_DIRECTORY = supportsDirectoryPicker()
const DIRECTORY_PICKER_STATUS = CAN_PICK_DIRECTORY ? 'available' : 'unavailable'

function UploadPage({ items, dispatch, categories, onCategoriesChange, classifying, onClassify }) {
  const panelRef = useRef(null)

  function addFiles(files) {
    if (!CAN_PICK_DIRECTORY || classifying) return
    const added = files.map((file) => createDocument(file, crypto.randomUUID()))
    dispatch({ type: 'add', items: added })
    for (const item of added) void prepareDocument(item, { dispatch })
  }

  function handleRemove(id) {
    if (!classifying) dispatch({ type: 'remove', id })
  }

  return (
    <PageShell>
      <PageHeader
        variant="hero"
        title="문서 분류기"
        lead={
          <>
            한꺼번에 받은 보고서를 카테고리별 폴더로 나눠 넣습니다. PDF·이미지는
            이 PC에서 텍스트를 읽고 결과를 저장합니다. 외부 분류에는 앞부분 텍스트만 보냅니다.
          </>
        }
      >
        <UploadFlow />
      </PageHeader>

      {!CAN_PICK_DIRECTORY && (
        <InlineNotice>
          이 브라우저는 폴더 선택을 지원하지 않아 저장까지 진행할 수 없습니다.
          크롬이나 엣지로 열어주세요.
        </InlineNotice>
      )}

      <CategoryEditor
        categories={categories}
        onChange={onCategoriesChange}
        disabled={classifying}
      />

      <AddFilesPanel
        ref={panelRef}
        items={items}
        onAddFiles={addFiles}
        onRemove={handleRemove}
        canPick={CAN_PICK_DIRECTORY}
        classifying={classifying}
      />

      {items.length > 0 && (
        <UploadActionBar
          items={items}
          categories={categories}
          directoryPickerStatus={DIRECTORY_PICKER_STATUS}
          classifying={classifying}
          onAdd={() => panelRef.current?.openPicker()}
          onClassify={onClassify}
        />
      )}
    </PageShell>
  )
}

export default UploadPage
