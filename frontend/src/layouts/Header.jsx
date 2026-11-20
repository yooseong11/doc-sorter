import { NavLink } from 'react-router'
import './Header.css'

// 업로드 → 확인 → 저장. 확인·저장은 데이터가 없으면 App의 가드가 /로 돌린다. (ADR 0023)
const STEPS = [
  { to: '/', label: '업로드', end: true },
  { to: '/confirm', label: '확인' },
  { to: '/save', label: '저장' },
]

function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <NavLink className="header__brand" to="/">
          문서 분류기
        </NavLink>

        <nav className="header__steps" aria-label="진행 단계">
          {STEPS.map((step, index) => (
            <NavLink
              key={step.to}
              to={step.to}
              end={step.end}
              className={({ isActive }) =>
                isActive ? 'header__step header__step--active' : 'header__step'}
            >
              <span className="header__step-index" aria-hidden="true">
                {index + 1}
              </span>
              <span className="header__step-label">{step.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

export default Header
