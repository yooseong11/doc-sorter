// 기본 카테고리 (ADR 0002) — 브라우저·서버 공용 계약 (ADR 0016)
// 카테고리 추가·이름 변경은 R3다. 지금은 고정 목록으로 둔다.
// 설명 한 줄은 AI 분류 프롬프트에 함께 들어간다. (ADR 0002)

export const UNCLASSIFIED = '미분류'

export const CATEGORIES = [
  { name: '비용 증빙', hint: '세금계산서, 영수증, 지출 결의' },
  { name: '근태', hint: '연차, 출퇴근, 근무 시간' },
  { name: '복지 신청', hint: '경조사비, 학자금, 복지 포인트' },
  { name: '계약서', hint: '용역·근로 계약, NDA, 합의서' },
]

export const CATEGORY_NAMES = CATEGORIES.map((category) => category.name)

// 드롭다운 순서. 미분류는 "해당 없음"이라 맨 뒤에 둔다.
export const CATEGORY_OPTIONS = [...CATEGORY_NAMES, UNCLASSIFIED]

export function hintOf(name) {
  return CATEGORIES.find((category) => category.name === name)?.hint ?? ''
}
