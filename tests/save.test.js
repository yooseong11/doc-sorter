import test from 'node:test'
import assert from 'node:assert/strict'
import { LOG_COLUMNS, appendLog, toCsvField, toCsvLine, formatStamp, logRow } from '../src/lib/logCsv.js'
import { planSaves, takenNames, uniqueName } from '../src/lib/savePlan.js'
import { saveAll, writeDocument, LOG_ERROR } from '../src/lib/saveFiles.js'
import { ensurePermission, folderLabel, pickRootDirectory, supportsDirectoryPicker } from '../src/lib/directory.js'
import { logFileName } from '../src/lib/savePath.js'

// 브라우저 File System Access API를 흉내 낸 메모리 폴더.
// 쓰기 직전 존재 확인·이어 쓰기·실패 격리를 DOM 없이 검증하려고 만든다.
function makeRoot(initial = {}) {
  const files = new Map(Object.entries(initial))
  const dirs = new Set([''])
  for (const key of files.keys()) {
    const parts = key.split('/')
    for (let i = 1; i < parts.length; i += 1) dirs.add(parts.slice(0, i).join('/'))
  }

  function fileHandle(key) {
    return {
      kind: 'file',
      name: key.slice(key.lastIndexOf('/') + 1),
      getFile: async () => ({ size: String(files.get(key) ?? '').length }),
      createWritable: async ({ keepExistingData = false } = {}) => {
        let cursor = keepExistingData ? String(files.get(key) ?? '').length : 0
        return {
          seek: async (n) => { cursor = n },
          write: async (chunk) => {
            const text = String(chunk)
            files.set(key, cursor > 0 ? String(files.get(key) ?? '') + text : text)
            cursor += text.length
          },
          close: async () => {},
          abort: async () => {},
        }
      },
    }
  }

  function dirHandle(path) {
    return {
      kind: 'directory',
      name: path ? path.slice(path.lastIndexOf('/') + 1) : 'root',
      async *values() {
        const prefix = path ? `${path}/` : ''
        const seen = new Set()
        for (const key of files.keys()) {
          if (!key.startsWith(prefix)) continue
          const rest = key.slice(prefix.length)
          const slash = rest.indexOf('/')
          const name = slash < 0 ? rest : rest.slice(0, slash)
          if (seen.has(name)) continue
          seen.add(name)
          yield slash < 0
            ? { kind: 'file', name, getFile: async () => ({ size: String(files.get(key)).length }) }
            : { kind: 'directory', name }
        }
      },
      getDirectoryHandle: async (name, options = {}) => {
        const next = path ? `${path}/${name}` : name
        if (!dirs.has(next)) {
          if (!options.create) {
            const error = new Error('없는 폴더')
            error.name = 'NotFoundError'
            throw error
          }
          dirs.add(next)
        }
        return dirHandle(next)
      },
      getFileHandle: async (name, options = {}) => {
        const key = path ? `${path}/${name}` : name
        if (!files.has(key)) {
          if (!options.create) {
            const error = new Error('없는 파일')
            error.name = 'NotFoundError'
            throw error
          }
          files.set(key, '')
        }
        return fileHandle(key)
      },
    }
  }

  return { handle: dirHandle(''), files, dirs }
}

const row = (over = {}) => ({
  id: over.id ?? 'a',
  name: '출장정산_영수증.pdf',
  size: 10,
  category: '비용 증빙',
  file: 'binary',
  saveStatus: 'waiting',
  ...over,
})

test('같은 이름이 없으면 그대로, 있으면 _2 _3 을 붙인다', () => {
  assert.deepEqual(uniqueName(new Set(), 'a.pdf'), { savedName: 'a.pdf', renamed: false })
  assert.deepEqual(uniqueName(new Set(['a.pdf']), 'a.pdf'), { savedName: 'a_2.pdf', renamed: true })
  assert.deepEqual(
    uniqueName(new Set(['a.pdf', 'a_2.pdf', 'a_3.pdf']), 'a.pdf'),
    { savedName: 'a_4.pdf', renamed: true },
  )
  assert.deepEqual(uniqueName(new Set(['보고서']), '보고서'), { savedName: '보고서_2', renamed: true })
  // 점이 앞에 오거나 여러 개인 이름도 확장자 자리를 지킨다.
  assert.deepEqual(uniqueName(new Set(['.gitignore']), '.gitignore'), { savedName: '.gitignore_2', renamed: true })
  assert.deepEqual(uniqueName(new Set(['a.b.c.pdf']), 'a.b.c.pdf'), { savedName: 'a.b.c_2.pdf', renamed: true })
})

test('폴더 안 기존 파일만 충돌로 보고 하위 폴더는 세지 않는다', async () => {
  const { handle } = makeRoot({
    '비용 증빙/전자세금계산서.pdf': 'x',
    '비용 증빙/9월/영수증.pdf': 'y',
  })
  const names = await takenNames(await handle.getDirectoryHandle('비용 증빙'))
  assert.deepEqual([...names], ['전자세금계산서.pdf'])
})

test('저장 계획은 기존 파일과 같은 배치 안 중복을 모두 피한다', async () => {
  const { handle, dirs } = makeRoot({ '비용 증빙/출장정산_영수증.pdf': 'x' })
  const rows = [
    row({ id: 'a' }),
    row({ id: 'b' }),
    row({ id: 'c', name: '전자세금계산서.pdf' }),
  ]
  const planned = await planSaves(rows, handle)

  assert.deepEqual(planned.map((r) => r.savedName), [
    '출장정산_영수증_2.pdf',
    '출장정산_영수증_3.pdf',
    '전자세금계산서.pdf',
  ])
  assert.deepEqual(planned.map((r) => r.renamed), [true, true, false])
  assert.equal(planned[0].target, '비용 증빙/출장정산_영수증_2.pdf')
  // 계획 단계에서는 폴더를 만들지 않는다.
  assert.deepEqual([...dirs], ['', '비용 증빙'])
})

test('이미 저장된 행은 계획을 다시 세워도 이름이 그대로다', async () => {
  const { handle, files } = makeRoot({ '비용 증빙/출장정산_영수증_2.pdf': 'x' })
  const rows = [row({ id: 'a', savedName: '출장정산_영수증_2.pdf', saveStatus: 'saved' })]
  const planned = await planSaves(rows, handle)

  assert.equal(planned[0].savedName, '출장정산_영수증_2.pdf')
  assert.equal(files.size, 1)
})

test('파일을 쓸 때 이름을 다시 확인해 덮어쓰지 않는다', async () => {
  const { handle, files } = makeRoot({ '비용 증빙/출장정산_영수증.pdf': '기존' })
  const result = await writeDocument(row(), handle)

  assert.equal(result.ok, true)
  assert.equal(result.savedName, '출장정산_영수증_2.pdf')
  assert.equal(files.get('비용 증빙/출장정산_영수증.pdf'), '기존')
  assert.equal(files.get('비용 증빙/출장정산_영수증_2.pdf'), 'binary')
})

test('미분류도 예외 없이 같은 이름의 폴더에 들어간다', async () => {
  const { handle, files } = makeRoot()
  const result = await writeDocument(row({ category: '미분류', name: '사내동호회_지원.hwp' }), handle)

  assert.equal(result.target, '미분류/사내동호회_지원.hwp')
  assert.equal(files.get('미분류/사내동호회_지원.hwp'), 'binary')
})

test('중간에 실패해도 끝까지 돌고 성공분은 되돌리지 않는다', async () => {
  const { handle } = makeRoot()
  const rows = [row({ id: 'a' }), row({ id: 'b' }), row({ id: 'c' }), row({ id: 'd' })]
  const written = []
  const states = new Map()
  const logCalls = []

  await saveAll(rows, {
    rootHandle: handle,
    logName: '분류기록표_260918.csv',
    onRow: (id, patch) => states.set(id, { ...states.get(id), ...patch }),
    write: async (target) => {
      if (target.id === 'b') return { ok: false, error: '권한이 회수되어 쓰지 못했습니다.' }
      written.push(target.id)
      return { ok: true, savedName: target.name, renamed: false, target: `비용 증빙/${target.name}` }
    },
    log: async (root, name, logged) => { logCalls.push(...logged.map((r) => r.id)) },
  })

  // 실패한 b 뒤의 c·d도 계속 처리한다.
  assert.deepEqual(written, ['a', 'c', 'd'])
  assert.deepEqual(logCalls, ['a', 'c', 'd'])
  assert.equal(states.get('a').saveStatus, 'saved')
  assert.equal(states.get('b').saveStatus, 'failed')
  assert.equal(states.get('d').saveStatus, 'saved')

  // 재시도는 실패한 파일만 한다.
  const retry = rows.filter((r) => states.get(r.id).saveStatus === 'failed')
  written.length = 0
  await saveAll(await planSaves(retry, handle), {
    rootHandle: handle,
    logName: '분류기록표_260918.csv',
    onRow: (id, patch) => states.set(id, { ...states.get(id), ...patch }),
    write: async (target) => {
      written.push(target.id)
      return { ok: true, savedName: target.name, renamed: false, target: `비용 증빙/${target.name}` }
    },
    log: async () => {},
  })
  assert.deepEqual(written, ['b'])
  assert.equal(states.get('b').saveStatus, 'saved')
})

test('기록표만 실패한 파일은 재시도 때 파일을 다시 쓰지 않는다', async () => {
  const { handle } = makeRoot()
  const rows = [row({ id: 'a' })]
  const states = new Map()
  let writes = 0
  let logs = 0

  const options = {
    rootHandle: handle,
    logName: '분류기록표_260918.csv',
    onRow: (id, patch) => states.set(id, { ...states.get(id), ...patch }),
    write: async (target) => {
      writes += 1
      return { ok: true, savedName: target.name, renamed: false, target: `비용 증빙/${target.name}` }
    },
  }

  await saveAll(rows, { ...options, log: async () => { logs += 1; throw new Error('quota') } })
  assert.equal(states.get('a').saveStatus, 'failed')
  assert.equal(states.get('a').error, LOG_ERROR)
  assert.equal(states.get('a').fileSaved, true)

  // 계획을 다시 세워도 이름이 바뀌지 않고, 파일 쓰기는 건너뛴다.
  const planned = await planSaves([{ ...rows[0], ...states.get('a') }], handle)
  assert.equal(planned[0].savedName, '출장정산_영수증.pdf')

  await saveAll(planned, { ...options, log: async () => { logs += 1 } })
  assert.equal(writes, 1)
  assert.equal(logs, 2)
  assert.equal(states.get('a').saveStatus, 'saved')
  assert.equal(states.get('a').fileSaved, false)
})

test('저장 시작을 다시 눌러도 이미 저장된 파일은 다시 쓰지 않는다', async () => {
  const { handle } = makeRoot()
  const rows = [row({ id: 'a' }), row({ id: 'b', name: '전자세금계산서.pdf' })]
  const states = new Map([['a', { saveStatus: 'saved', savedName: '출장정산_영수증.pdf' }]])
  const written = []

  await saveAll(await planSaves(rows.map((r) => ({ ...r, ...states.get(r.id) })), handle), {
    rootHandle: handle,
    logName: '분류기록표_260918.csv',
    onRow: (id, patch) => states.set(id, { ...states.get(id), ...patch }),
    write: async (target) => {
      written.push(target.id)
      return { ok: true, savedName: target.savedName, renamed: false, target: `비용 증빙/${target.savedName}` }
    },
    log: async () => {},
  })

  assert.deepEqual(written, ['b'])
  assert.equal(states.get('a').saveStatus, 'saved')
})

test('기록표는 새로 만들 때만 BOM과 헤더를 붙이고 같은 날은 이어 쓴다', async () => {
  const { handle, files } = makeRoot()
  const name = logFileName(new Date(2026, 8, 18))
  assert.equal(name, '분류기록표_260918.csv')
  const date = new Date(2026, 8, 18, 14, 5, 9)
  const logged = row({ savedName: '출장정산_영수증_2.pdf', target: '비용 증빙/출장정산_영수증_2.pdf' })

  await appendLog(handle, name, [logged], date)
  const first = files.get(name)
  assert.equal(first, `\uFEFF${LOG_COLUMNS.join(',')}\r\n2026-09-18 14:05:09,출장정산_영수증.pdf,비용 증빙,비용 증빙/출장정산_영수증_2.pdf,10\r\n`)

  await appendLog(handle, name, [row({ id: 'b', name: '전자세금계산서.pdf' })], date)
  const second = files.get(name)
  assert.equal(second.split('\uFEFF').length, 2)
  assert.equal(second.split('\r\n').filter(Boolean).length, 3)
  assert.ok(second.startsWith(first))
})

test('CSV 값은 쉼표·따옴표·줄바꿈을 이스케이프한다', () => {
  assert.equal(toCsvField('평범한이름.pdf'), '평범한이름.pdf')
  assert.equal(toCsvField('쉼표,이름.pdf'), '"쉼표,이름.pdf"')
  assert.equal(toCsvField('따옴표"이름.pdf'), '"따옴표""이름.pdf"')
  assert.equal(toCsvField('줄\n바꿈.pdf'), '"줄\n바꿈.pdf"')
  assert.equal(toCsvField(undefined), '')
  assert.equal(toCsvLine(['a', 'b,c']), 'a,"b,c"')
  assert.equal(formatStamp(new Date(2026, 0, 2, 3, 4, 5)), '2026-01-02 03:04:05')
  assert.deepEqual(logRow({ name: 'a.pdf', category: '근태', target: '근태/a.pdf', size: 7 }, new Date(2026, 0, 2, 3, 4, 5)), [
    '2026-01-02 03:04:05', 'a.pdf', '근태', '근태/a.pdf', 7,
  ])
})

test('폴더 선택을 취소하거나 권한을 거부하면 null을 돌려준다', async () => {
  assert.equal(await pickRootDirectory(async () => { throw Object.assign(new Error('취소'), { name: 'AbortError' }) }), null)
  const handle = { name: '경영지원' }
  assert.equal(await pickRootDirectory(async () => handle), handle)
  assert.equal(folderLabel(handle), '경영지원')
  assert.equal(folderLabel(null), '')
  assert.equal(typeof supportsDirectoryPicker(), 'boolean')
})

test('권한이 이미 있으면 다시 묻지 않고, 없으면 요청한다', async () => {
  let asked = 0
  const granted = { queryPermission: async () => 'granted', requestPermission: async () => { asked += 1; return 'granted' } }
  assert.equal(await ensurePermission(granted), true)
  assert.equal(asked, 0)

  const denied = { queryPermission: async () => 'prompt', requestPermission: async () => { asked += 1; return 'denied' } }
  assert.equal(await ensurePermission(denied), false)
  assert.equal(asked, 1)

  // 권한 API가 없는 핸들은 막지 않는다.
  assert.equal(await ensurePermission({}), true)
  assert.equal(await ensurePermission(null), true)
})
