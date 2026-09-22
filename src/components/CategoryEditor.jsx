import { useState } from 'react'
import { categoryIssues } from '../../shared/categories.js'
import { MAX_CATEGORY_NAME_CHARS, MAX_CATEGORY_HINT_CHARS } from '../../shared/classifyContract.js'
import './CategoryEditor.css'

// 카테고리 편집 — 프리셋은 분류 요청에 실려 나가므로 분류 전에만 고칠 수 있다. (ADR 0019)
// 드롭존(.upload__panel) 바깥에 둔다. 안에 두면 입력칸 위로 파일을 떨어뜨리게 된다.
// 설명은 비어도 받고 거르지 않는다. 경고만 띄운다. (ADR 0020)

function CategoryEditor({ categories, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const issues = categoryIssues(categories)

  function updateField(index, field, value) {
    onChange(categories.map((category, at) => (
      at === index ? { ...category, [field]: value } : category
    )))
  }

  return (
    <section className={`categories${open ? ' categories--open' : ''}`}>
      <button
        type="button"
        className="categories__summary"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
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
            {categories.map((category, index) => {
              const issue = issues[index]
              return (
                <li className="categories__row" key={index}>
                  <div className="categories__fields">
                    <input
                      className="categories__input categories__input--name"
                      type="text"
                      value={category.name}
                      maxLength={MAX_CATEGORY_NAME_CHARS}
                      disabled={disabled}
                      aria-label={`카테고리 ${index + 1} 이름`}
                      placeholder="이름"
                      onChange={(event) => updateField(index, 'name', event.target.value)}
                    />
                    <input
                      className="categories__input categories__input--hint"
                      type="text"
                      value={category.hint}
                      maxLength={MAX_CATEGORY_HINT_CHARS}
                      disabled={disabled}
                      aria-label={`카테고리 ${index + 1} 설명`}
                      placeholder="이 카테고리에 들어갈 문서의 예"
                      onChange={(event) => updateField(index, 'hint', event.target.value)}
                    />
                  </div>
                  {issue && (
                    <p className={`categories__issue categories__issue--${issue.level}`} role="status">
                      {issue.message}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

export default CategoryEditor
