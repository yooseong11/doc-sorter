// 기본 카테고리 (ADR 0002) — 브라우저·서버 공용 계약 (ADR 0016)
// 분류에 실제로 쓰는 목록은 런타임 상태이며 요청 본문에 실려 온다. 여기 있는 건 시작값이다. (ADR 0019)
// 설명 한 줄은 AI 분류 프롬프트에 함께 들어간다. (ADR 0002)

export const UNCLASSIFIED = '미분류'

export const DEFAULT_CATEGORIES = [
  { name: '비용 증빙', hint: '세금계산서, 영수증, 지출 결의' },
  { name: '근태', hint: '연차, 출퇴근, 근무 시간' },
  { name: '복지 신청', hint: '경조사비, 학자금, 복지 포인트' },
  { name: '계약서', hint: '용역·근로 계약, NDA, 합의서' },
]

// 카테고리 배열 하나로 화면·계약·서버가 쓸 조회를 한 번에 만든다. (ADR 0019)
// 미분류는 편집 대상이 아니므로 여기서 항상 맨 뒤에 붙인다. "해당 없음"이라 목록 끝이다. (ADR 0014)
export function categoryPreset(categories = DEFAULT_CATEGORIES) {
  const names = categories.map((category) => category.name)
  const options = [...names, UNCLASSIFIED]
  const hints = new Map(categories.map((category) => [category.name, category.hint]))
  return {
    categories,
    names,
    options,
    hintOf: (name) => hints.get(name) ?? '',
    has: (name) => options.includes(name),
  }
}

// 편집 중 각 행의 문제를 돌려준다. block은 분류를 막고, warn은 알리기만 한다. (ADR 0020)
// 길이 상한은 입력칸의 maxLength가 막으므로 여기서 보지 않는다.
export function categoryIssues(categories) {
  const counts = new Map()
  for (const category of categories) {
    const name = category.name.trim()
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return categories.map((category) => {
    const name = category.name.trim()
    if (name.length === 0) return { level: 'block', message: '이름을 입력해 주세요.' }
    if (name === UNCLASSIFIED) return { level: 'block', message: `'${UNCLASSIFIED}'는 카테고리 이름으로 쓸 수 없습니다.` }
    if (counts.get(name) > 1) return { level: 'block', message: '같은 이름이 이미 있습니다.' }
    if (category.hint.trim().length === 0) return { level: 'warn', message: '설명이 없으면 분류가 부정확해집니다.' }
    return null
  })
}

export function hasBlockingIssue(categories) {
  return categoryIssues(categories).some((issue) => issue?.level === 'block')
}
