export class ApiError extends Error {
  constructor(message, status = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const messages = {
  400: '요청 내용을 확인해 주세요.',
  405: '지원하지 않는 요청 방식입니다.',
  502: '분류하지 못했습니다. 서버 설정 또는 연결을 확인해 주세요.',
  503: '서버를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  504: '서버 응답 시간이 초과되었습니다. 다시 시도해 주세요.',
}

export async function send(path, options = {}, fetcher = fetch) {
  let response
  try {
    response = await fetcher(path, options)
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new ApiError('서버 응답 시간이 초과되었습니다. 다시 시도해 주세요.')
    }
    if (error.name === 'AbortError') throw error
    throw new ApiError('서버에 연결하지 못했습니다. 네트워크와 서버 상태를 확인해 주세요.')
  }
  if (!response.ok) {
    throw new ApiError(messages[response.status] ?? `요청을 처리할 수 없습니다 (HTTP ${response.status}).`, response.status)
  }
  try {
    return await response.json()
  } catch {
    throw new ApiError('서버가 유효한 JSON을 반환하지 않았습니다.', response.status)
  }
}
