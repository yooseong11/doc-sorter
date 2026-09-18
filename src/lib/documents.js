import { UNCLASSIFIED, CATEGORY_OPTIONS } from './categories.js'

export function createDocument(file, id) {
  return { id, file, name: file.name, size: file.size, status: 'reading', readable: true, text: '', category: UNCLASSIFIED, quote: '', saveStatus: 'waiting' }
}
// 저장 상태도 파일 객체 하나에 모아 둔다. 뒤로 갔다 와도 저장 이름·결과가 남는다. (ADR 0013)
export function documentsReducer(items, action) {
  switch (action.type) {
    case 'add': return [...items, ...action.items]
    case 'remove': return items.filter((item) => item.id !== action.id)
    case 'reset': return []
    case 'update': return items.map((item) => item.id === action.id ? { ...item, ...action.patch } : item)
    // 저장 계획(저장될 이름·경로)을 파일 객체에 반영해 저장 전 목록에 보이게 한다. (ADR 0005 · 0013)
    case 'plan': {
      const plan = new Map(action.rows.map((row) => [row.id, row]))
      return items.map((item) => plan.has(item.id) ? { ...item, ...plan.get(item.id) } : item)
    }
    case 'category': return CATEGORY_OPTIONS.includes(action.category)
      ? items.map((item) => item.id === action.id ? { ...item, category: action.category, status: 'classified', error: null } : item) : items
    default: return items
  }
}
