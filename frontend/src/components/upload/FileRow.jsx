import StatusBadge from '../common/StatusBadge'
import FileIcon from '../common/FileIcon'
import FileMeta from '../common/FileMeta'
import './FileRow.css'

function FileRow({ item, onRemove, disabled }) {
  const { id, name, size } = item.source
  const { phase, error, readable } = item.classification
  const status = phase === 'ready' ? 'waiting' : phase.endsWith('-failed') ? 'failed' : phase

  return (
    <li className="file-row">
      <FileIcon name={name} />

      <div className="file-row__main">
        <p className="file-row__name" title={name}>
          {name}
        </p>
        <FileMeta name={name} size={size} />
        {!readable && (
          <p className="file-row__note">
            내용을 읽을 수 없어 미분류로 보냅니다. 저장은 됩니다.
          </p>
        )}
      </div>

      <div className="file-row__side">
        {!readable && <StatusBadge status="unreadable" />}
        <StatusBadge status={status} title={error} />
        <button
          type="button"
          className="file-row__remove"
          disabled={disabled}
          onClick={() => onRemove(id)}
          aria-label={`${name} 목록에서 빼기`}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </li>
  )
}

export default FileRow
