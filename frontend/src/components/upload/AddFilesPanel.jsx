import { useImperativeHandle, useRef, useState } from 'react'
import FileRow from './FileRow'
import UploadEmptyState from './UploadEmptyState'
import { ACCEPT, isAccepted } from '../../lib/read/acceptedFiles'
import './AddFilesPanel.css'

// 파일을 더하는 곳 — 빈 상태·목록·드롭존·숨은 file input을 한 컴포넌트가 맡는다.
// "파일 더 넣기"는 ref의 openPicker()로 같은 input을 연다.
function AddFilesPanel({ ref, items, onAddFiles, onRemove, canPick, classifying }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const canDrop = canPick && !classifying
  const disabled = !canPick || classifying

  useImperativeHandle(ref, () => ({
    openPicker: () => inputRef.current?.click(),
  }), [])

  function addFiles(files) {
    if (!canPick || classifying) return
    onAddFiles(files)
  }

  function handlePick(event) {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    addFiles(picked)
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
    <>
      <section
        className={`upload__panel${dragging ? ' upload__panel--dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {items.length === 0 ? (
          <UploadEmptyState
            canPick={canPick}
            classifying={classifying}
            onPick={() => inputRef.current?.click()}
            onAddFiles={addFiles}
          />
        ) : (
          <ul className="upload__list">
            {items.map((item) => (
              <FileRow
                key={item.source.id}
                item={item}
                onRemove={onRemove}
                disabled={disabled}
              />
            ))}
          </ul>
        )}

        {dragging && (
          <div className="upload__dropmask" role="status">
            <span className="upload__dropmask-text">여기에 놓으면 추가됩니다</span>
          </div>
        )}
      </section>

      <input
        ref={inputRef}
        className="upload__input"
        type="file"
        multiple
        accept={ACCEPT}
        onChange={handlePick}
      />
    </>
  )
}

export default AddFilesPanel
