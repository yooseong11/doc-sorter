import { extensionOf } from '../../lib/read/fileKind'
import './FileSummary.css'

function FileIcon({ name }) {
  const ext = extensionOf(name) || 'file'

  return (
    <span className="file-icon" aria-hidden="true">
      {ext.toUpperCase().slice(0, 4)}
    </span>
  )
}

export default FileIcon
