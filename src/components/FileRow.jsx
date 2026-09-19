import StatusBadge from './StatusBadge'
import { extensionOf, formatSize } from '../lib/read/fileKind'
import './FileRow.css'

function FileRow({ item, onRemove, disabled }) {
  const ext = extensionOf(item.name) || 'file'

  return (
    <li className="file-row">
      <span className="file-row__icon" aria-hidden="true">
        {ext.toUpperCase().slice(0, 4)}
      </span>

      <div className="file-row__main">
        <p className="file-row__name" title={item.name}>
          {item.name}
        </p>
        <p className="file-row__meta">
          {formatSize(item.size)} · {ext.toUpperCase()} 문서
        </p>
        {!item.readable && (
          <p className="file-row__note">
            내용을 읽을 수 없어 미분류로 보냅니다. 저장은 됩니다.
          </p>
        )}
      </div>

      <div className="file-row__side">
        {!item.readable && <StatusBadge status="unreadable" />}
        <StatusBadge status={item.status} title={item.error} />
        <button
          type="button"
          className="file-row__remove"
          disabled={disabled}
          onClick={() => onRemove(item.id)}
          aria-label={`${item.name} 목록에서 빼기`}
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
