import { useEffect, useRef, useState } from 'react'
import { groupItems } from '../groupOrder'
import { logFileName } from '../lib/save/savePath'
import { planSaves } from '../lib/save/savePlan'
import { saveAll } from '../lib/save/saveFiles'
import { SAVE_PHASE } from '../lib/state/savePhases'
import {
  ensurePermission,
  folderLabel,
  pickRootDirectory,
  recallDirectory,
  rememberDirectory,
} from '../lib/save/saveFolder'

export function useSaveFlow({ items, dispatch, preset, onSavingChange }) {
  const [phase, setPhase] = useState(() => items.some((item) => item.save.phase !== SAVE_PHASE.WAITING) ? 'done' : 'idle')
  const [notice, setNotice] = useState('')
  const [folder, setFolder] = useState('')
  const rootRef = useRef(null)
  const alive = useRef(true)
  const logName = logFileName()

  const savedCount = items.filter((item) => item.save.phase === SAVE_PHASE.SAVED).length
  const failedCount = items.filter((item) => item.save.phase.endsWith('-failed')).length
  const folders = groupItems(items, preset).map((group) => ({
    name: group.name,
    count: group.rows.length,
  }))
  const countText = phase === 'idle'
    ? `${items.length}개를 ${folders.length}개 폴더에 나눠 넣습니다`
    : phase === SAVE_PHASE.SAVING
      ? '저장하는 중입니다. 창을 닫지 마세요'
      : failedCount > 0
        ? `${savedCount}개 저장됨 · ${failedCount}개 실패`
        : `${savedCount}개를 모두 저장했습니다`

  // StrictMode는 effect를 두 번 실행한다. 되살리는 것도 여기서 해야 한다.
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // 지난번에 고른 폴더를 그대로 쓴다. 권한이 남아 있을 때만 복원한다. (ADR 0003)
  useEffect(() => {
    let cancelled = false
    recallDirectory().then((handle) => {
      if (cancelled || !handle) return
      rootRef.current = handle
      setFolder(folderLabel(handle))
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function pickFolder() {
    setNotice('')
    const handle = await pickRootDirectory()
    if (!handle) {
      // 취소·권한 거부. 아무것도 만들지 않고 확인 화면 상태를 그대로 둔다. (ADR 0003)
      setNotice('폴더를 선택해야 저장할 수 있습니다.')
      return
    }
    if (!(await ensurePermission(handle))) {
      setNotice('폴더에 쓸 권한이 없습니다. 다른 폴더를 골라 주세요.')
      return
    }

    rootRef.current = handle
    setFolder(folderLabel(handle))
    await rememberDirectory(handle)
  }

  // 저장 직전에 이름을 확정한다. 그때 폴더에 무엇이 있는지 알 수 있기 때문이다. (ADR 0005)
  async function save(targets) {
    const rootHandle = rootRef.current
    if (!rootHandle) {
      setNotice('폴더를 선택해야 저장할 수 있습니다.')
      return
    }
    setNotice('')
    setPhase(SAVE_PHASE.SAVING)
    onSavingChange(true)

    const onRow = (id, patch) => {
      if (alive.current) dispatch({ type: 'save', id, patch })
    }
    try {
      // 저장 로직은 폴더 이름을 그대로 받는다(categoryId를 모른다). id를 프리셋으로
      // 이름으로 바꾼 사본을 만들어 넘긴다. save 쪽만 dispatch에 쓰이므로 안전하다. (ADR 0022)
      const named = targets.map((item) => ({
        ...item,
        classification: { ...item.classification, category: preset.nameOf(item.classification.categoryId) },
      }))
      // 저장될 이름을 먼저 목록에 반영한다. 대기 중인 줄에도 `_2`가 보인다. (ADR 0005)
      const planned = await planSaves(named, rootHandle)
      dispatch({ type: 'plan', rows: planned })
      await saveAll(planned, { rootHandle, onRow, logName })
    } finally {
      onSavingChange(false)
      if (alive.current) setPhase('done')
    }
  }

  // 재시도는 실패한 파일만. 저장된 파일은 그대로 둔다. (ADR 0011)
  async function retryFailed(id) {
    const failed = items.filter(
      (item) => item.save.phase.endsWith('-failed') && (!id || item.source.id === id),
    )
    await save(failed)
  }

  return {
    phase,
    notice,
    folder,
    logName,
    savedCount,
    failedCount,
    folders,
    countText,
    pickFolder,
    retryFailed,
    save,
  }
}
