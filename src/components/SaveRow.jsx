import StatusBadge from './StatusBadge'
import { extensionOf, formatSize } from '../lib/read/fileKind'
import './SaveRow.css'

// 저장 화면의 한 줄. 원래 파일명 → 저장될 경로 · 상태 배지. (ADR 0011 · 0013)
// 같은 이름이 있어 _2가 붙은 줄은 따로 알린다. (ADR 0005)

function SaveRow({ item, onRetry }) {
  const { id, name, size } = item.source
  const { category } = item.classification
  const { phase, error, savedName, target, renamed } = item.save
  const failed = phase.endsWith('-failed')
  // 계획만 세운 상태(planned)는 아직 대기 중인 것으로 보여준다.
  const status = phase === 'planned' ? 'waiting' : failed ? 'failed' : phase
  const ext = extensionOf(name) || 'file'

  return (
    <li className={`save-row${failed ? ' save-row--failed' : ''}`}>
      <span className="save-row__icon" aria-hidden="true">
        {ext.toUpperCase().slice(0, 4)}
      </span>

      <span className="save-row__main">
        <span className="save-row__name" title={name}>
          {name}
        </span>
        <span className="save-row__meta">
          {formatSize(size)} · {ext.toUpperCase()} 문서
        </span>
      </span>

      <span className="save-row__arrow" aria-hidden="true">
        →
      </span>

      <span className="save-row__target">
        <span className="save-row__path" title={target}>
          <span className="save-row__folder">{category}</span>
          <span className="save-row__slash" aria-hidden="true">
            /
          </span>
          {savedName}
        </span>
        {renamed && (
          <span className="save-row__renamed">
            같은 이름이 있어 {savedName}로 바꿨습니다
          </span>
        )}
        {failed && (
          <span className="save-row__error">
            {error ?? '저장하지 못했습니다.'}
            <button
              type="button"
              className="save-row__link"
              onClick={() => onRetry(id)}
            >
              다시 시도
            </button>
          </span>
        )}
      </span>

      <span className="save-row__side">
        <StatusBadge status={status} title={error} />
      </span>
    </li>
  )
}

export default SaveRow
