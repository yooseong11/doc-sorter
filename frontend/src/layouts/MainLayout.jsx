import { Outlet } from 'react-router'
import Header from './Header'
import './MainLayout.css'

function MainLayout() {
  return (
    <div className="layout">
      <Header />

      <div className="layout__main">
        <Outlet />
      </div>

      <a
        className="layout__github-link"
        href="https://github.com/yooseong11/doc-sorter"
        target="_blank"
        rel="noreferrer"
      >
        <span className="layout__github-icon" aria-hidden="true">
          <svg viewBox="0 0 19 19" width="20" height="20">
            <use href="/icons.svg#github-icon" />
          </svg>
        </span>
        <span className="layout__github-copy">
          <strong>제작 과정 살펴보기</strong>
          <span>기획·AI활용방법·코드를 구경해보세요!</span>
        </span>
      </a>
    </div>
  )
}

export default MainLayout
