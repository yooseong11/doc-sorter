import { useState } from 'react'
import { SAMPLE_DOCUMENTS } from '../sampleDocuments.js'

async function fetchSample(sample) {
  const response = await fetch(sample.url)
  if (!response.ok) throw new Error(`샘플을 불러오지 못했습니다: ${sample.fileName}`)
  const blob = await response.blob()
  return new File([blob], sample.fileName, { type: blob.type })
}

function SampleDocumentsButton({ disabled, onFiles }) {
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  async function handleClick() {
    if (disabled || loading) return
    setLoading(true)
    setFailed(false)
    try {
      onFiles(await Promise.all(SAMPLE_DOCUMENTS.map(fetchSample)))
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className="upload__button upload__button--quiet"
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading && <span className="upload__spinner" aria-hidden="true" />}
      {loading
        ? '샘플 준비 중…'
        : failed
          ? '불러오기 실패 · 다시 시도'
          : '샘플로 바로 해보기'}
    </button>
  )
}

export default SampleDocumentsButton
