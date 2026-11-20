import ResultRow from './ResultRow'
import { UNCLASSIFIED } from '../../../shared/categories.js'
import './CategoryGroup.css'

// 카테고리 하나의 묶음 — 이름·개수·설명 헤더와 그에 속한 행들.
function CategoryGroup({ group, preset, onChangeCategory, onRetry, disabled }) {
  const unclassified = group.name === UNCLASSIFIED

  return (
    <section
      className={`confirm__group${unclassified ? ' confirm__group--review' : ''}`}
    >
      <header className="confirm__group-head">
        <h2 className="confirm__group-name">{group.name}</h2>
        <span className="confirm__group-count">{group.rows.length}개</span>
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
            onChangeCategory={onChangeCategory}
            onRetry={onRetry}
            disabled={disabled}
          />
        ))}
      </ul>
    </section>
  )
}

export default CategoryGroup
