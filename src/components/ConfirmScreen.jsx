import ResultRow from './ResultRow'
import { UNCLASSIFIED } from '../../shared/categories.js'
import { groupOrderOf } from '../groupOrder'
import './ConfirmScreen.css'

// S2 확인 화면 — 카테고리별로 묶어서 보여주고, 행마다 드롭다운으로 바꾼다. (ADR 0004)
// 실패한 파일도 목록에 남기고 사유와 재시도 버튼을 붙인다. (ADR 0013)

function ConfirmScreen({ items: rows, dispatch, preset, busy, onRetry, onBack, onNext }) {
  const groups = groupOrderOf(preset).map((name) => ({
    name,
    rows: rows.filter((row) => row.classification.category === name),
  })).filter((group) => group.rows.length > 0)

  const reviewCount = rows.filter(
    (row) => row.classification.phase.endsWith('-failed')
      || row.classification.category === UNCLASSIFIED,
  ).length

  const allUnclassified =
    rows.length > 0
    && rows.every((row) => row.classification.category === UNCLASSIFIED)

  function handleChangeCategory(id, category) {
    // 리듀서가 검증할 목록을 액션에 같이 싣는다. (ADR 0009 · 0019)
    if (!busy) dispatch({ type: 'category', id, category, options: preset.options })
  }

  return (
    <main className="confirm">
      <div className="confirm__glow" aria-hidden="true" />

      <div className="confirm__head">
        <div className="confirm__intro">
          <h1 className="confirm__title">분류 결과 확인</h1>
          <p className="confirm__lead">
            카테고리별로 묶어 두었습니다. 틀린 것만 드롭다운으로 바꾸면 그
            묶음으로 옮겨갑니다. 파일명 줄을 누르면 근거 문장이 펼쳐집니다.
          </p>
        </div>

        <div className="confirm__summary">
          <div className="confirm__stat">
            <span className="confirm__stat-value">{rows.length}</span>
            <span className="confirm__stat-label">전체</span>
          </div>
          <div
            className={`confirm__stat${reviewCount > 0 ? ' confirm__stat--review' : ''}`}
          >
            <span className="confirm__stat-value">{reviewCount}</span>
            <span className="confirm__stat-label">확인 필요</span>
          </div>
        </div>
      </div>

      {allUnclassified && (
        <p className="confirm__notice" role="status">
          분류된 파일이 없습니다. 카테고리 설명을 확인해 주세요.
        </p>
      )}

      <div className="confirm__groups">
        {groups.map((group) => {
          const unclassified = group.name === UNCLASSIFIED
          return (
            <section
              key={group.name}
              className={`confirm__group${unclassified ? ' confirm__group--review' : ''}`}
            >
              <header className="confirm__group-head">
                <h2 className="confirm__group-name">{group.name}</h2>
                <span className="confirm__group-count">
                  {group.rows.length}개
                </span>
                <p className="confirm__group-hint">
                  {unclassified
                    ? '카테고리를 직접 골라 주세요.'
                    : preset.hintOf(group.name)}
                </p>
              </header>

              <ul className="confirm__list">
                {group.rows.map((row) => (
                  <ResultRow
                    key={row.source.id}
                    item={row}
                    preset={preset}
                    onChangeCategory={handleChangeCategory}
                    onRetry={onRetry}
                    disabled={busy}
                  />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <div className="confirm__bar">
        <p className="confirm__count">
          {reviewCount > 0
            ? `확인이 필요한 파일이 ${reviewCount}개 있습니다`
            : '모두 확인했습니다'}
        </p>

        <div className="confirm__bar-actions">
          <button
            type="button"
            className="confirm__button confirm__button--quiet"
            onClick={onBack}
            disabled={busy}
          >
            파일 다시 고르기
          </button>
          <button type="button" className="confirm__button" onClick={onNext} disabled={busy}>
            저장할 폴더 고르기
          </button>
        </div>
      </div>
    </main>
  )
}

export default ConfirmScreen
