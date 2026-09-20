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

// 전환용. 아직 프리셋을 받지 않는 호출부가 남아 있다. 4단계에서 지운다.
const defaultPreset = categoryPreset()
export const CATEGORIES = DEFAULT_CATEGORIES
export const CATEGORY_NAMES = defaultPreset.names
export const CATEGORY_OPTIONS = defaultPreset.options
export const hintOf = defaultPreset.hintOf
