import './PageShell.css'

// 화면 공통 껍데기 — 폭·여백과 상단 광원을 한 곳에 둔다.
function PageShell({ children }) {
  return (
    <main className="page">
      <div className="page__glow" aria-hidden="true" />
      {children}
    </main>
  )
}

export default PageShell
