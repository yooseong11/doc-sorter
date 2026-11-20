import './UploadFlow.css'

// 업로드 화면 제목 옆의 장식 흐름도 — 문서가 폴더로 들어가는 모양.
function UploadFlow() {
  return (
    <div className="upload__flow" aria-hidden="true">
      <div className="upload__chip">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            d="M6 3h8l4 4v14H6z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M14 3v4h4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        <span>문서</span>
      </div>

      <span className="upload__flow-line" />

      <div className="upload__flow-mark">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path
            d="M4 7h6l2 2h8v9H4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <span className="upload__flow-line" />

      <div className="upload__chip upload__chip--accent">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            d="M3 6h6l2 2h10v11H3z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        <span>폴더</span>
      </div>
    </div>
  )
}

export default UploadFlow
