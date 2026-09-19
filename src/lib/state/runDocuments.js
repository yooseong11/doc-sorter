import { extractText } from '../read/extractText.js'
import { buildClassificationInput } from '../../../shared/classifyContract.js'
import { UNCLASSIFIED } from '../../../shared/categories.js'
import { requestClassification } from '../classify/classify.js'

function withClassification(item, patch) {
  return {
    ...item,
    classification: { ...item.classification, ...patch },
  }
}

function updateClassification(dispatch, item, patch) {
  dispatch({ type: 'classification', id: item.source.id, patch })
}

export async function prepareDocument(item, { dispatch, extract = extractText }) {
  updateClassification(dispatch, item, { phase: 'reading', error: null })
  try {
    const result = await extract(item.source.file)
    const patch = { ...result, phase: 'ready', error: null }
    updateClassification(dispatch, item, patch)
    return withClassification(item, patch)
  } catch {
    const patch = {
      phase: 'read-failed',
      category: UNCLASSIFIED,
      quote: '',
      error: '파일을 읽지 못했습니다. 파일 손상 또는 암호 설정을 확인해 주세요.',
    }
    updateClassification(dispatch, item, patch)
    return withClassification(item, patch)
  }
}

export async function classifyDocuments(items, { dispatch, classify = requestClassification, extract = extractText, retry = false }) {
  for (let item of items) {
    const { phase } = item.classification
    const retryable = phase === 'read-failed' || phase === 'classify-failed'
    if (retry ? !retryable : phase !== 'ready') continue
    if (phase === 'read-failed') {
      item = await prepareDocument(item, { dispatch, extract })
      if (item.classification.phase === 'read-failed') continue
    }
    if (!item.classification.readable) {
      updateClassification(dispatch, item, {
        phase: 'classified',
        category: UNCLASSIFIED,
        error: null,
      })
      continue
    }
    updateClassification(dispatch, item, { phase: 'classifying', error: null })
    try {
      const result = await classify(buildClassificationInput(item))
      updateClassification(dispatch, item, {
        ...result,
        phase: 'classified',
        error: null,
      })
    } catch {
      updateClassification(dispatch, item, {
        phase: 'classify-failed',
        category: UNCLASSIFIED,
        quote: '',
        error: '분류에 실패했습니다. 서버 설정과 연결을 확인한 뒤 다시 시도해 주세요.',
      })
    }
  }
}
