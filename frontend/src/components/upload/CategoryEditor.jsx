import { useState } from 'react'
import { categoryIssues } from '../../../shared/categories.js'
import { defaultCategories } from '../../lib/state/categoryStore'
import { MAX_CATEGORIES } from '../../../shared/classifyContract.js'
import CategoryRow from './CategoryRow'
import CategoryResetConfirm from './CategoryResetConfirm'
import './CategoryEditor.css'

// 카테고리 편집 — 프리셋은 분류 요청에 실려 나가므로 분류 전에만 고칠 수 있다. (ADR 0019)
// 드롭존(.upload__panel) 바깥에 둔다. 안에 두면 입력칸 위로 파일을 떨어뜨리게 된다.
// 설명은 비어도 받고 거르지 않는다. 경고만 띄운다. (ADR 0020)
// 개수는 여기서 막는다. categoryIssues는 행 단위라 목록 전체의 개수를 보지 못한다.

function CategoryEditor({ categories, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  // 되돌리기는 없으므로(범위 결정) 누르기 전에 한 번 더 묻는다.
  const [confirming, setConfirming] = useState(false)
  const issues = categoryIssues(categories)
  const canAdd = !disabled && categories.length < MAX_CATEGORIES
  const canRemove = !disabled && categories.length > 1

  function updateField(id, field, value) {
    onChange(categories.map((category) => (
      category.id === id ? { ...category, [field]: value } : category
    )))
  }

  function addCategory() {
    if (!canAdd) return
    onChange([...categories, { id: crypto.randomUUID(), name: '', hint: '' }])
  }

  function removeCategory(id) {
    if (!canRemove) return
    onChange(categories.filter((category) => category.id !== id))
  }

  return (
    <section className={`categories${open ? ' categories--open' : ''}`}>
      <button
        type="button"
        className="categories__summary"
        aria-expanded={open}
        onClick={() => { setOpen(!open); setConfirming(false) }}
      >
        <span className="categories__count">카테고리 {categories.length}개</span>
        <span className="categories__names">
          {categories.map((category) => category.name.trim() || '이름 없음').join(' · ')}
        </span>
        <span className="categories__pencil" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              d="M4 20h4L19 9l-4-4L4 16v4z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M14 6l4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="categories__pencil-label">{open ? '닫기' : '편집'}</span>
      </button>

      {open && (
        <div className="categories__body">
          <p className="categories__guide">
            설명은 AI가 그대로 읽고 판단합니다. 어떤 문서가 여기 들어가는지 적어
            주세요.
          </p>

          <ul className="categories__list">
            {categories.map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                index={index}
                issue={issues[index]}
                disabled={disabled}
                canRemove={canRemove}
                onChangeField={updateField}
                onRemove={removeCategory}
              />
            ))}
          </ul>

          <div className="categories__actions">
            <button
              type="button"
              className="categories__add"
              disabled={!canAdd}
              onClick={addCategory}
            >
              + 카테고리 추가
            </button>
            <span className="categories__limit">
              {categories.length} / {MAX_CATEGORIES}
            </span>
          </div>

          <CategoryResetConfirm
            confirming={confirming}
            disabled={disabled}
            onAsk={() => setConfirming(true)}
            onReset={() => { onChange(defaultCategories()); setConfirming(false) }}
            onCancel={() => setConfirming(false)}
          />
        </div>
      )}
    </section>
  )
}

export default CategoryEditor
