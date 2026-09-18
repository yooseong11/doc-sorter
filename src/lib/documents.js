import { UNCLASSIFIED, CATEGORY_OPTIONS } from './categories.js'

export function createDocument(file, id) {
  return { id, file, name: file.name, size: file.size, status: 'reading', readable: true, text: '', category: UNCLASSIFIED, quote: '' }
}
export function documentsReducer(items, action) {
  switch (action.type) {
    case 'add': return [...items, ...action.items]
    case 'remove': return items.filter((item) => item.id !== action.id)
    case 'reset': return []
    case 'update': return items.map((item) => item.id === action.id ? { ...item, ...action.patch } : item)
    case 'category': return CATEGORY_OPTIONS.includes(action.category)
      ? items.map((item) => item.id === action.id ? { ...item, category: action.category, status: 'classified', error: null } : item) : items
    default: return items
  }
}
