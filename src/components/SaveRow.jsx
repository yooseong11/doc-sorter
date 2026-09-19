import StatusBadge from './StatusBadge'
import { extensionOf, formatSize } from '../lib/read/fileKind'
import './SaveRow.css'

// 저장 화면의 한 줄. 원래 파일명 → 저장될 경로 · 상태 배지. (ADR 0011)
// 같은 이름이 있어 _2가 붙은 줄은 따로 알린다. (ADR 0005)

function SaveRow({ item, onRetry }) {
  const ext = extensionOf(item.name) || 'file'
  const failed = item.saveStatus === 'failed'

  return (
    <li className={`save-row${failed ? ' save-row--failed' : ''}`}>
      <span className="save-row__icon" aria-hidden="true">
        {ext.toUpperCase().slice(0, 4)}
      </span>

      <span className="save-row__main">
        <span className="save-row__name" title={item.name}>
          {item.name}
        </span>
        <span className="save-row__meta">
          {formatSize(item.size)} · {ext.toUpperCase()} 문서
        </span>
      </span>

      <span className="save-row__arrow" aria-hidden="true">
        →
      </span>

      <span className="save-row__target">
        <span className="save-row__path" title={item.target}>
          <span className="save-row__folder">{item.category}</span>
          <span className="save-row__slash" aria-hidden="true">
            /
          </span>
          {item.savedName}
        </span>
        {item.renamed && (
          <span className="save-row__renamed">
            같은 이름이 있어 {item.savedName}로 바꿨습니다
          </span>
        )}
        {failed && (
          <span className="save-row__error">
            {item.error ?? '저장하지 못했습니다.'}
            <button
              type="button"
              className="save-row__link"
              onClick={() => onRetry(item.id)}
            >
              다시 시도
            </button>
          </span>
        )}
      </span>

      <span className="save-row__side">
        <StatusBadge status={item.saveStatus} title={item.error} />
      </span>
    </li>
  )
}

export default SaveRow
