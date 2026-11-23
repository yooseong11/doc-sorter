import { extractText } from '../read/extractText.js'
import { buildClassificationInput } from '../../../shared/classifyContract.js'
import { UNCLASSIFIED } from '../../../shared/categories.js'
import { requestClassification } from '../../api/classify.js'
import { CLASSIFICATION_PHASE } from './classificationPhases.js'

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
  updateClassification(dispatch, item, { phase: CLASSIFICATION_PHASE.READING, error: null })
  try {
    const result = await extract(item.source.file)
    const patch = { ...result, phase: CLASSIFICATION_PHASE.READY, error: null }
    updateClassification(dispatch, item, patch)
    return withClassification(item, patch)
  } catch {
    const patch = {
      phase: CLASSIFICATION_PHASE.READ_FAILED,
      categoryId: UNCLASSIFIED,
      quote: '',
      error: '파일을 읽지 못했습니다. 파일 손상 또는 암호 설정을 확인해 주세요.',
    }
    updateClassification(dispatch, item, patch)
    return withClassification(item, patch)
  }
}

// preset은 이번 분류에 쓸 카테고리 목록이다. 호출하는 쪽이 반드시 넘긴다. (ADR 0019)
export async function classifyDocuments(items, { dispatch, classify = requestClassification, extract = extractText, retry = false, preset }) {
  for (let item of items) {
    const { phase } = item.classification
    const retryable = phase === CLASSIFICATION_PHASE.READ_FAILED || phase === CLASSIFICATION_PHASE.CLASSIFY_FAILED
    if (retry ? !retryable : phase !== CLASSIFICATION_PHASE.READY) continue
    if (phase === CLASSIFICATION_PHASE.READ_FAILED) {
      item = await prepareDocument(item, { dispatch, extract })
      if (item.classification.phase === CLASSIFICATION_PHASE.READ_FAILED) continue
    }
    if (!item.classification.readable) {
      updateClassification(dispatch, item, {
        phase: CLASSIFICATION_PHASE.CLASSIFIED,
        categoryId: UNCLASSIFIED,
        error: null,
      })
      continue
    }
    updateClassification(dispatch, item, { phase: CLASSIFICATION_PHASE.CLASSIFYING, error: null })
    try {
      const result = await classify(buildClassificationInput(item, preset.categories), preset)
      updateClassification(dispatch, item, {
        ...result,
        phase: CLASSIFICATION_PHASE.CLASSIFIED,
        error: null,
      })
    } catch {
      updateClassification(dispatch, item, {
        phase: CLASSIFICATION_PHASE.CLASSIFY_FAILED,
        categoryId: UNCLASSIFIED,
        quote: '',
        error: '분류에 실패했습니다. 서버 설정과 연결을 확인한 뒤 다시 시도해 주세요.',
      })
    }
  }
}
