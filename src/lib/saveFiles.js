// 카테고리 폴더에 파일을 쓰고 기록표에 한 줄씩 남긴다. (ADR 0003 · 0005 · 0011)
// 이미 저장된 파일은 되돌리지 않는다. 실패해도 반복문은 끝까지 돌고, 재시도는 실패한 파일만 한다.

import { savePath } from './savePath.js'
import { takenNames, uniqueName } from './savePlan.js'
import { appendLog } from './logCsv.js'

export function saveError(error) {
  if (error?.name === 'NotAllowedError') return '폴더 권한이 회수되어 쓰지 못했습니다.'
  if (error?.name === 'QuotaExceededError') return '저장 공간이 부족해 쓰지 못했습니다.'
  return '파일에 쓰지 못했습니다. 폴더 권한과 남은 공간을 확인해 주세요.'
}

export const LOG_ERROR = '파일은 저장했지만 기록표에 남기지 못했습니다.'

// 파일 하나를 쓴다. 쓰기 직전에 이름을 다시 확인해 덮어쓰지 않는다. (ADR 0005)
// 폴더는 없을 때만 만든다. 있어도 그대로 쓴다. (ADR 0003)
export async function writeDocument(row, rootHandle) {
  try {
    const directory = await rootHandle.getDirectoryHandle(row.category, { create: true })
    const { savedName, renamed } = uniqueName(await takenNames(directory), row.name)
    const handle = await directory.getFileHandle(savedName, { create: true })

    try {
      const writable = await handle.createWritable()
      try {
        await writable.write(row.file)
        await writable.close()
      } catch (error) {
        // 쓰다 만 파일을 남기지 않는다. 이미 끝난 다른 파일은 건드리지 않는다. (ADR 0011)
        await writable.abort().catch(() => {})
        throw error
      }
    } catch (error) {
      return { ok: false, error: saveError(error) }
    }

    return { ok: true, savedName, renamed, target: savePath(row.category, savedName) }
  } catch (error) {
    return { ok: false, error: saveError(error) }
  }
}

// 순차로 저장한다. 파일 하나가 끝날 때마다 화면 상태를 바꾸고 기록표에 이어 쓴다.
// 기록표 쓰기까지 끝나야 성공으로 본다. 기록 없이 저장만 되면 폴더와 표가 어긋난다. (ADR 0011)
// 기록만 실패한 파일은 `fileSaved`로 표시해 재시도 때 파일을 다시 쓰지 않는다. 같은 파일이 둘 생긴다.
export async function saveAll(rows, { rootHandle, onRow, logName, date, log = appendLog, write = writeDocument }) {
  for (const row of rows) {
    // 이미 저장된 파일은 건드리지 않는다. 재시도 목록에 섞여 들어와도 마찬가지다. (ADR 0011)
    if (row.saveStatus === 'saved') continue
    onRow(row.id, { saveStatus: 'saving', error: undefined, savedName: row.savedName })

    const result = row.fileSaved
      ? { ok: true, savedName: row.savedName, renamed: row.renamed, target: row.target }
      : await write(row, rootHandle)
    if (!result.ok) {
      onRow(row.id, { saveStatus: 'failed', error: result.error })
      continue
    }

    const saved = { ...row, ...result, saveStatus: 'saved' }
    try {
      await log(rootHandle, logName, [saved], date)
    } catch {
      onRow(row.id, {
        ...result,
        fileSaved: true,
        saveStatus: 'failed',
        error: LOG_ERROR,
      })
      continue
    }

    onRow(row.id, { ...result, fileSaved: false, saveStatus: 'saved', error: undefined })
  }
}
