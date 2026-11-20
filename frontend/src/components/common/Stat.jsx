import './Stat.css'

// 숫자 통계 카드. tone은 확인 필요(warn) · 저장됨(ok) · 실패(danger)에만 쓴다.
function StatGroup({ children }) {
  return <div className="stat-group">{children}</div>
}

function Stat({ value, label, tone = 'default' }) {
  return (
    <div className={`stat${tone !== 'default' ? ` stat--${tone}` : ''}`}>
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  )
}

export { Stat, StatGroup }
