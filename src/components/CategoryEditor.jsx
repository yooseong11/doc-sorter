import { useState } from 'react'
import './CategoryEditor.css'

// 카테고리 편집 — 프리셋은 분류 요청에 실려 나가므로 분류 전에만 고칠 수 있다. (ADR 0019)
// 드롭존(.upload__panel) 바깥에 둔다. 안에 두면 입력칸 위로 파일을 떨어뜨리게 된다.
// 설명은 비어도 받고 거르지 않는다. 경고만 띄운다. (ADR 0020)

function CategoryEditor({ categories }) {
  const [open, setOpen] = useState(false)

  return (
    <section className="categories">
      <button
        type="button"
        className="categories__summary"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="categories__count">카테고리 {categories.length}개</span>
        <span className="categories__names">
          {categories.map((category) => category.name).join(' · ')}
        </span>
        <span
          className={`categories__caret${open ? ' categories__caret--open' : ''}`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className="categories__body">
          <p className="categories__placeholder">
            편집 폼은 다음 단계에서 붙입니다.
          </p>
        </div>
      )}
    </section>
  )
}

export default CategoryEditor
