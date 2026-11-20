import './PageHeader.css'

// 화면 제목 + 리드. hero는 업로드 화면처럼 오른쪽에 장식이 붙는 변형이다.
function PageHeader({ title, lead, variant = 'default', children }) {
  return (
    <div className={`page-head${variant === 'hero' ? ' page-head--hero' : ''}`}>
      <div className="page-head__intro">
        <h1 className="page-head__title">{title}</h1>
        <p className="page-head__lead">{lead}</p>
      </div>
      {children}
    </div>
  )
}

export default PageHeader
