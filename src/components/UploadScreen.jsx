import { useRef, useState } from 'react'
import FileRow from './FileRow'
import CategoryEditor from './CategoryEditor'
import SampleDocumentsButton from './SampleDocumentsButton'
import { createDocument } from '../lib/state/documentsReducer'
import { prepareDocument } from '../lib/state/runDocuments'
import { supportsDirectoryPicker } from '../lib/save/saveFolder'
import { hasBlockingIssue } from '../../shared/categories.js'
import './UploadScreen.css'

// 폴더 선택 API가 없으면 첫 화면에서 막는다. (ADR 0012)
// 브라우저 이름이 아니라 기능이 있는지로 판단한다.
const CAN_PICK_DIRECTORY = supportsDirectoryPicker()

const ACCEPT = '.pdf,.docx,.hwpx,.hwp,.doc'
const ACCEPT_EXTENSIONS = ACCEPT.split(',')

// 드롭된 파일은 탐색기가 거르지 않으므로 여기서 확장자를 본다.
// 읽을 수 없는 형식(hwp, doc)도 받는다. 목록에 남겨 미분류로 저장한다. (ADR 0007)
function isAccepted(file) {
  const name = file.name.toLowerCase()
  return ACCEPT_EXTENSIONS.some((extension) => name.endsWith(extension))
}

function UploadScreen({ items, dispatch, categories, onCategoriesChange, classifying, onClassify }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const reading = items.some((item) => item.classification.phase === 'reading')
  // 이름이 비었거나 겹치면 서버 스키마가 400으로 막는다. 누르기 전에 막는다. (ADR 0020)
  const categoriesBlocked = hasBlockingIssue(categories)
  const canClassify = CAN_PICK_DIRECTORY && items.length > 0 && !reading && !classifying && !categoriesBlocked
  const canDrop = CAN_PICK_DIRECTORY && !classifying

  function addFiles(files) {
    if (!CAN_PICK_DIRECTORY || classifying) return
    const added = files.map((file) => createDocument(file, crypto.randomUUID()))
    dispatch({ type: 'add', items: added })
    for (const item of added) void prepareDocument(item, { dispatch })
  }

  function handlePick(event) {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    addFiles(picked)
  }

  function handleRemove(id) {
    if (!classifying) dispatch({ type: 'remove', id })
  }

  // preventDefault를 빼면 브라우저가 파일을 그대로 열어 화면을 떠난다. 받을 수 없을 때도 막는다.
  function handleDragOver(event) {
    event.preventDefault()
    if (!canDrop) return
    event.dataTransfer.dropEffect = 'copy'
    setDragging(true)
  }

  // 자식 요소로 옮겨갈 때도 dragleave가 뜬다. 패널 밖으로 나갔을 때만 끈다.
  function handleDragLeave(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return
    setDragging(false)
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (!canDrop) return
    addFiles(Array.from(event.dataTransfer.files ?? []).filter(isAccepted))
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

      <CategoryEditor
        categories={categories}
        onChange={onCategoriesChange}
        disabled={classifying}
      />

      <section
        className={`upload__panel${dragging ? ' upload__panel--dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
            <div className="upload__empty-actions">
              <button
                type="button"
                className="upload__button"
                onClick={() => inputRef.current?.click()}
                disabled={!CAN_PICK_DIRECTORY}
              >
                파일 선택
              </button>
              <SampleDocumentsButton
                disabled={!CAN_PICK_DIRECTORY || classifying}
                onFiles={addFiles}
              />
            </div>
          </div>
        ) : (
          <ul className="upload__list">
            {items.map((item) => (
              <FileRow key={item.source.id} item={item} onRemove={handleRemove} disabled={classifying || !CAN_PICK_DIRECTORY} />
            ))}
          </ul>
        )}

        {dragging && (
          <div className="upload__dropmask" role="status">
            <span className="upload__dropmask-text">여기에 놓으면 추가됩니다</span>
          </div>
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
