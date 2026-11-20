// 최상위 폴더를 고르고 핸들을 기억한다. (ADR 0003)
// 폴더 선택 API가 없으면 브라우저를 막는다. 이름이 아니라 기능으로 판단한다. (ADR 0012)

import { get, set } from 'idb-keyval'

const ROOT_KEY = 'doc-sorter:root-directory'

export function supportsDirectoryPicker() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

// 사용자가 취소하거나 권한을 거부하면 null. 예외를 화면까지 올리지 않는다.
export async function pickRootDirectory(picker) {
  const pick = picker ?? window.showDirectoryPicker.bind(window)
  try {
    return await pick({ mode: 'readwrite' })
  } catch {
    return null
  }
}

// 저장 전에 권한을 확인한다. 이미 있으면 다시 묻지 않는다.
export async function ensurePermission(handle, mode = 'readwrite') {
  if (!handle?.queryPermission) return true
  const options = { mode }
  if ((await handle.queryPermission(options)) === 'granted') return true
  return (await handle.requestPermission(options)) === 'granted'
}

export async function rememberDirectory(handle) {
  try {
    await set(ROOT_KEY, handle)
  } catch {
    // 기억하지 못해도 이번 저장은 그대로 한다.
  }
}

export async function recallDirectory() {
  try {
    const handle = await get(ROOT_KEY)
    if (!handle) return null
    return (await ensurePermission(handle)) ? handle : null
  } catch {
    return null
  }
}

// File System Access API는 전체 경로를 주지 않는다. 폴더 이름만 보여준다.
export function folderLabel(handle) {
  return handle?.name ?? ''
}
