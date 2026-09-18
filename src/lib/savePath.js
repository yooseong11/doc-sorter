// 저장 경로 규칙 (ADR 0003 · 0005 · 0006)
// 카테고리 이름이 곧 하위 폴더다. 미분류도 예외 없이 `미분류` 폴더에 넣는다. (ADR 0014)

// 같은 이름이 있으면 _2, _3 … 을 붙인다. 덮어쓰지 않는다. (ADR 0005)
export function withSuffix(name, n) {
  if (n <= 1) return name
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return `${name}_${n}`
  return `${name.slice(0, dot)}_${n}${name.slice(dot)}`
}

export function savePath(category, name) {
  return `${category}/${name}`
}

// 분류기록표_YYMMDD.csv — 같은 날은 이어 쓴다. (ADR 0006)
export function logFileName(date = new Date()) {
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `분류기록표_${yy}${mm}${dd}.csv`
}
