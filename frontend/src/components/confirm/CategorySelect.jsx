import { UNCLASSIFIED } from '../../../shared/categories.js'
import './CategorySelect.css'

// 드롭다운 목록은 이 화면이 쓰는 프리셋에서 온다. 모듈 상수가 아니다. (ADR 0019)
function CategorySelect({ value, categories, onChange, disabled, ariaLabel }) {
  return (
    <span className="result-row__select-wrap">
      <select
        className="result-row__select"
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
        <option value={UNCLASSIFIED}>{UNCLASSIFIED}</option>
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
  )
}

export default CategorySelect
