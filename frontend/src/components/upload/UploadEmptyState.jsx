import Button from '../common/Button'
import SampleDocumentsButton from '../../../sample/SampleDocumentsButton.jsx'
import './UploadEmptyState.css'

function UploadEmptyState({ canPick, classifying, onPick, onAddFiles }) {
  return (
    <div className="upload__empty">
      <div className="upload__empty-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28">
          <path
            d="M12 16V5m0 0L8 9m4-4l4 4M4 17v2h16v-2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="upload__empty-title">분류할 문서를 선택하세요</h2>
      <p className="upload__empty-hint">
        파일을 선택하면 여기에 목록이 나옵니다. PDF · DOCX · HWPX
      </p>
      <div className="upload__empty-actions">
        <Button onClick={onPick} disabled={!canPick}>
          파일 선택
        </Button>
        <SampleDocumentsButton
          disabled={!canPick || classifying}
          onFiles={onAddFiles}
        />
      </div>
    </div>
  )
}

export default UploadEmptyState
