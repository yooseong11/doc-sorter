import {
  MAX_CATEGORY_NAME_CHARS,
  MAX_CATEGORY_HINT_CHARS,
} from '../../../shared/classifyContract.js'

function CategoryRow({
  category,
  index,
  issue,
  disabled,
  canRemove,
  onChangeField,
  onRemove,
}) {
  return (
    <li className="categories__row">
      <div className="categories__fields">
        <input
          className="categories__input categories__input--name"
          type="text"
          value={category.name}
          maxLength={MAX_CATEGORY_NAME_CHARS}
          disabled={disabled}
          aria-label={`카테고리 ${index + 1} 이름`}
          placeholder="이름"
          onChange={(event) => onChangeField(category.id, 'name', event.target.value)}
        />
        <input
          className="categories__input categories__input--hint"
          type="text"
          value={category.hint}
          maxLength={MAX_CATEGORY_HINT_CHARS}
          disabled={disabled}
          aria-label={`카테고리 ${index + 1} 설명`}
          placeholder="이 카테고리에 들어갈 문서의 예"
          onChange={(event) => onChangeField(category.id, 'hint', event.target.value)}
        />
        <button
          type="button"
          className="categories__remove"
          disabled={!canRemove}
          aria-label={`${category.name.trim() || `카테고리 ${index + 1}`} 삭제`}
          onClick={() => onRemove(category.id)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M7 7l10 10M17 7L7 17"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {issue && (
        <p className={`categories__issue categories__issue--${issue.level}`} role="status">
          {issue.message}
        </p>
      )}
    </li>
  )
}

export default CategoryRow
