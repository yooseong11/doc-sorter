// 분류기록표 CSV (ADR 0006 · 0011)
// 원래 파일명과 저장 경로의 대응표. 파일 하나를 쓸 때마다 한 줄씩 이어 쓴다.
// 엑셀이 한글을 읽으려면 UTF-8 BOM이 필요하다. BOM은 파일을 새로 만들 때만 붙인다.

export const LOG_COLUMNS = [
  '처리일시',
  '원래 파일명',
  '카테고리',
  '저장 경로',
  '크기(바이트)',
]

const BOM = '\uFEFF'
const EOL = '\r\n'
const NEEDS_QUOTE = /[",\r\n]/

// 쉼표·큰따옴표·줄바꿈이 든 값은 큰따옴표로 감싸고 안쪽 따옴표를 두 번 쓴다.
export function toCsvField(value) {
  const text = value == null ? '' : String(value)
  if (!NEEDS_QUOTE.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsvLine(values) {
  return values.map(toCsvField).join(',')
}

// 같은 형식의 시각을 남긴다. 파일명에 처리 날짜를 넣지 않는 대신 여기서 남긴다. (ADR 0005)
export function formatStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function logRow(row, date = new Date()) {
  return [
    formatStamp(date),
    row.name,
    row.category,
    row.target ?? `${row.category}/${row.savedName}`,
    row.size,
  ]
}

// 헤더가 필요한지 알려면 파일이 이미 있었는지부터 봐야 한다.
async function openLogFile(rootHandle, name) {
  try {
    const handle = await rootHandle.getFileHandle(name)
    const file = await handle.getFile()
    return { handle, existed: true, size: file.size }
  } catch {
    const handle = await rootHandle.getFileHandle(name, { create: true })
    return { handle, existed: false, size: 0 }
  }
}

// 기존 내용 뒤에 이어 쓴다. 같은 날 다시 저장해도 앞의 줄을 지우지 않는다. (ADR 0006)
export async function appendLog(rootHandle, name, rows, date = new Date()) {
  const { handle, existed, size } = await openLogFile(rootHandle, name)
  const body = rows.map((row) => toCsvLine(logRow(row, date))).join(EOL) + EOL
  const chunk = existed ? body : BOM + toCsvLine(LOG_COLUMNS) + EOL + body

  const writable = await handle.createWritable({ keepExistingData: true })
  await writable.seek(size)
  await writable.write(chunk)
  await writable.close()
}
