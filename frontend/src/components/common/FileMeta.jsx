import { extensionOf, formatSize } from '../../lib/read/fileKind'
import './FileSummary.css'

function FileMeta({ name, size }) {
  const ext = extensionOf(name) || 'file'

  return (
    <span className="file-meta">
      {formatSize(size)} · {ext.toUpperCase()} 문서
    </span>
  )
}

export default FileMeta
