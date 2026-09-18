import { useId, useState } from 'react'
import StatusBadge from './StatusBadge'
import { CATEGORY_OPTIONS, UNCLASSIFIED } from '../lib/categories'
import { extensionOf, formatSize } from '../lib/fileKind'
import './ResultRow.css'

// 확인 화면의 한 줄. 파일명 · 카테고리 드롭다운 · 근거 한 줄. (ADR 0004)
// 확신이 없는 항목(미분류 · 분류 실패)만 펼친 채로 시작한다.

function ResultRow({ item, onChangeCategory, onRetry }) {
  const needsReview = item.status === 'failed' || item.category === UNCLASSIFIED
  const [open, setOpen] = useState(needsReview)
  const bodyId = useId()
  const ext = extensionOf(item.name) || 'file'

  function handlePreview() {
    // 파일이 이미 브라우저에 있어서 서버 없이 바로 띄운다. (ADR 0004)
    const url = URL.createObjectURL(item.file)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  return (
    <li className={`result-row${needsReview ? ' result-row--review' : ''}`}>
      <div className="result-row__head">
        <button
          type="button"
          className="result-row__toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={bodyId}
        >
          <span
            className={`result-row__chevron${open ? ' result-row__chevron--open' : ''}`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 16 16" width="16" height="16">
              <path
                d="M4 6l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <span className="result-row__icon" aria-hidden="true">
            {ext.toUpperCase().slice(0, 4)}
          </span>

          <span className="result-row__main">
            <span className="result-row__name" title={item.name}>
              {needsReview && (
                <span className="result-row__warn" role="img" aria-label="확인 필요">
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <path
                      d="M8 2l6 11H2z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 6v3.5M8 11.5v.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              )}
              {item.name}
            </span>
            <span className="result-row__meta">
              {formatSize(item.size)} · {ext.toUpperCase()} 문서
            </span>
          </span>

        </button>

        <div className="result-row__side">
          {item.status === 'failed' && (
            <StatusBadge status="failed" title={item.error} />
          )}

          <span className="result-row__select-wrap">
            <select
              className="result-row__select"
              value={item.category}
              aria-label={`${item.name} 카테고리`}
              onChange={(event) => onChangeCategory(item.id, event.target.value)}
            >
              {CATEGORY_OPTIONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <span className="result-row__select-mark" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="14" height="14">
                <path
                  d="M4 6l4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </span>
        </div>
      </div>

      {open && (
        <div className="result-row__body" id={bodyId}>
          {item.status === 'failed' ? (
            // 실패는 사유를 적고 그 파일만 다시 보낸다. (ADR 0013)
            <p className="result-row__note">
              {item.error ?? '분류하지 못했습니다.'}
              <button
                type="button"
                className="result-row__link"
                onClick={() => onRetry(item.id)}
              >
                다시 시도
              </button>
            </p>
          ) : item.quote ? (
            <blockquote className="result-row__quote">{item.quote}</blockquote>
          ) : (
            <p className="result-row__note">
              분류할 근거를 찾지 못했습니다. 카테고리를 직접 골라 주세요.
            </p>
          )}

          {item.file && (
            <button
              type="button"
              className="result-row__link"
              onClick={handlePreview}
            >
              미리보기
            </button>
          )}
        </div>
      )}
    </li>
  )
}

export default ResultRow
