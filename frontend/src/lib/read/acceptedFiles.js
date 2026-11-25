// 파일 선택·드래그로 받는 형식. 읽을 수 없는 형식도 목록에는 남긴다. (ADR 0007)
export const ACCEPT = '.pdf,.docx,.hwpx,.hwp,.doc,.png,.jpg,.jpeg'

const ACCEPT_EXTENSIONS = ACCEPT.split(',')

export function isAccepted(file) {
  const name = file.name.toLowerCase()
  return ACCEPT_EXTENSIONS.some((extension) => name.endsWith(extension))
}
