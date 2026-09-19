// 확장자로 텍스트를 꺼낼 수 있는 형식인지 판정한다. (ADR 0007)
// 읽을 수 없는 형식도 목록에서 빼지 않는다. 미분류로 넘겨 저장·기록은 똑같이 한다.

const READABLE = ['pdf', 'docx', 'hwpx']

export function extensionOf(name) {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return ''
  return name.slice(dot + 1).toLowerCase()
}

export function isReadable(name) {
  return READABLE.includes(extensionOf(name))
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
