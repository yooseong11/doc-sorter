import { UNCLASSIFIED, CATEGORY_OPTIONS } from '../../../shared/categories.js'

export function createDocument(file, id) {
  return {
    source: {
      id,
      file,
      name: file.name,
      size: file.size,
    },
    classification: {
      phase: 'reading',
      error: null,
      readable: true,
      text: '',
      category: UNCLASSIFIED,
      quote: '',
    },
    save: {
      phase: 'waiting',
      error: null,
      savedName: null,
      target: null,
      renamed: false,
    },
  }
}

function hasId(item, id) {
  return item.source.id === id
}

// 원본·분류·저장 상태를 파일 객체 하나에 모으되 단계별 객체로 분리한다. (ADR 0013)
export function documentsReducer(items, action) {
  switch (action.type) {
    case 'add': return [...items, ...action.items]
    case 'remove': return items.filter((item) => !hasId(item, action.id))
    case 'reset': return []
    case 'classification': return items.map((item) => hasId(item, action.id)
      ? { ...item, classification: { ...item.classification, ...action.patch } }
      : item)
    case 'save': return items.map((item) => hasId(item, action.id)
      ? { ...item, save: { ...item.save, ...action.patch } }
      : item)
    // 저장 계획(저장될 이름·경로)을 파일 객체에 반영해 저장 전 목록에 보이게 한다. (ADR 0005 · 0013)
    case 'plan': {
      const plan = new Map(action.rows.map((row) => [row.source.id, row.save]))
      return items.map((item) => plan.has(item.source.id)
        ? { ...item, save: { ...item.save, ...plan.get(item.source.id) } }
        : item)
    }
    case 'category': return CATEGORY_OPTIONS.includes(action.category)
      ? items.map((item) => hasId(item, action.id)
        ? {
            ...item,
            classification: {
              ...item.classification,
              category: action.category,
              phase: 'classified',
              error: null,
            },
          }
        : item)
      : items
    default: return items
  }
}
