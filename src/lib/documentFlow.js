import { extractText } from './read/extractText.js'
import { buildClassificationInput } from '../../shared/classifyContract.js'
import { UNCLASSIFIED } from '../../shared/categories.js'
import { requestClassification } from './classify.js'

export async function prepareDocument(item, { dispatch, extract = extractText }) {
  dispatch({ type: 'update', id: item.id, patch: { status: 'reading', error: null } })
  try {
    const result = await extract(item.file)
    const patch = { ...result, status: 'waiting', error: null, failedStage: null }
    dispatch({ type: 'update', id: item.id, patch })
    return { ...item, ...patch }
  } catch {
    const patch = { status: 'failed', failedStage: 'read', category: UNCLASSIFIED, error: '파일을 읽지 못했습니다. 파일 손상 또는 암호 설정을 확인해 주세요.' }
    dispatch({ type: 'update', id: item.id, patch })
    return { ...item, ...patch }
  }
}
export async function classifyDocuments(items, { dispatch, classify = requestClassification, extract = extractText, retry = false }) {
  for (let item of items) {
    if (retry ? item.status !== 'failed' : item.status !== 'waiting') continue
    if (retry && item.failedStage === 'read') {
      item = await prepareDocument(item, { dispatch, extract })
      if (item.status === 'failed') continue
    }
    if (!item.readable) {
      dispatch({ type: 'update', id: item.id, patch: { status: 'classified', category: UNCLASSIFIED } })
      continue
    }
    dispatch({ type: 'update', id: item.id, patch: { status: 'classifying', error: null } })
    try {
      const result = await classify(buildClassificationInput(item))
      dispatch({ type: 'update', id: item.id, patch: { ...result, status: 'classified', failedStage: null, error: null } })
    } catch {
      dispatch({ type: 'update', id: item.id, patch: { status: 'failed', category: UNCLASSIFIED, quote: '', failedStage: 'classify', error: '분류에 실패했습니다. 서버 설정과 연결을 확인한 뒤 다시 시도해 주세요.' } })
    }
  }
}
