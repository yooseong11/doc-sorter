import './InlineNotice.css'

function InlineNotice({ children }) {
  return (
    <p className="notice" role="status">
      {children}
    </p>
  )
}

export default InlineNotice
