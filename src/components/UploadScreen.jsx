import { useRef } from 'react'
import FileRow from './FileRow'
import { createDocument } from '../lib/state/documentsReducer'
import { prepareDocument } from '../lib/state/runDocuments'
import { supportsDirectoryPicker } from '../lib/save/saveFolder'
import './UploadScreen.css'

// 폴더 선택 API가 없으면 첫 화면에서 막는다. (ADR 0012)
// 브라우저 이름이 아니라 기능이 있는지로 판단한다.
const CAN_PICK_DIRECTORY = supportsDirectoryPicker()

const ACCEPT = '.pdf,.docx,.hwpx,.hwp,.doc'

function UploadScreen({ items, dispatch, classifying, onClassify }) {
  const inputRef = useRef(null)
  const reading = items.some((item) => item.status === 'reading')
  const canClassify = CAN_PICK_DIRECTORY && items.length > 0 && !reading && !classifying

  function handlePick(event) {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!CAN_PICK_DIRECTORY || classifying) return
    const added = picked.map((file) => createDocument(file, crypto.randomUUID()))
    dispatch({ type: 'add', items: added })
    for (const item of added) void prepareDocument(item, { dispatch })
  }

  function handleRemove(id) {
    if (!classifying) dispatch({ type: 'remove', id })
  }

  return (
    <main className="upload">
      <div className="upload__glow" aria-hidden="true" />

      <div className="upload__hero">
        <div className="upload__intro">
          <h1 className="upload__title">문서 분류기</h1>
          <p className="upload__lead">
            한꺼번에 받은 보고서를 카테고리별 폴더로 나눠 넣습니다. 파일은
            브라우저 안에만 있고, 분류에 쓰는 앞부분 텍스트만 서버로 보냅니다.
          </p>
        </div>

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
      </div>

      {!CAN_PICK_DIRECTORY && (
        <p className="upload__notice" role="status">
          이 브라우저는 폴더 선택을 지원하지 않아 저장까지 진행할 수 없습니다.
          크롬이나 엣지로 열어주세요.
        </p>
      )}

      <section className="upload__panel">
        {items.length === 0 ? (
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
            <button
              type="button"
              className="upload__button"
              onClick={() => inputRef.current?.click()}
              disabled={!CAN_PICK_DIRECTORY}
            >
              파일 선택
            </button>
          </div>
        ) : (
          <ul className="upload__list">
            {items.map((item) => (
              <FileRow key={item.id} item={item} onRemove={handleRemove} disabled={classifying || !CAN_PICK_DIRECTORY} />
            ))}
          </ul>
        )}
      </section>

      {items.length > 0 && (
        <div className="upload__bar">
          <p className="upload__count">
            {reading ? (
              <span className="upload__count-loading">
                <span className="upload__spinner" aria-hidden="true" />
                내용을 읽는 중입니다…
              </span>
            ) : (
              `${items.length}개 준비됨`
            )}
          </p>

          <div className="upload__bar-actions">
            <button
              type="button"
              className="upload__button upload__button--quiet"
              onClick={() => inputRef.current?.click()}
              disabled={classifying || !CAN_PICK_DIRECTORY}
            >
              파일 더 넣기
            </button>
            <button
              type="button"
              className="upload__button"
              onClick={onClassify}
              disabled={!canClassify}
            >
              {classifying && (
                <span className="upload__spinner" aria-hidden="true" />
              )}
              {classifying ? '분류하는 중…' : '분류 시작'}
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        className="upload__input"
        type="file"
        multiple
        accept={ACCEPT}
        onChange={handlePick}
      />
    </main>
  )
}

export default UploadScreen
