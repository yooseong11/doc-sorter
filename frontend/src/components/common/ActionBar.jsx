import './ActionBar.css'

// 화면 하단 고정 바 — 왼쪽에 상태 문구, 오른쪽에 버튼 묶음.
function ActionBar({ children, actions }) {
  return (
    <div className="action-bar">
      <p className="action-bar__text">{children}</p>
      <div className="action-bar__actions">{actions}</div>
    </div>
  )
}

export default ActionBar
