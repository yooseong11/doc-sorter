import { useRef, useState } from 'react'
import { classifyDocuments } from '../lib/state/runDocuments'
import { CLASSIFICATION_PHASE } from '../lib/state/classificationPhases'

export function useClassification({ items, dispatch, preset, onComplete }) {
  const [busy, setBusy] = useState(false)
  // state 반영 전 연속 호출도 막는다.
  const running = useRef(false)

  async function runClassification(id) {
    if (running.current || items.some((item) => item.classification.phase === CLASSIFICATION_PHASE.READING)) return
    running.current = true
    setBusy(true)
    try {
      await classifyDocuments(id ? items.filter((item) => item.source.id === id) : items, {
        dispatch, preset, retry: Boolean(id),
      })
      onComplete()
    } finally {
      running.current = false
      setBusy(false)
    }
  }

  return { busy, runClassification }
}
