import { useState } from 'react'
import Button from '../src/components/common/Button'
import { loadSampleDocuments } from './loadSampleDocuments.js'

function SampleDocumentsButton({ disabled, onFiles }) {
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  async function handleClick() {
    if (disabled || loading) return
    setLoading(true)
    setFailed(false)
    try {
      onFiles(await loadSampleDocuments())
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="quiet"
      onClick={handleClick}
      disabled={disabled || loading}
      loading={loading}
    >
      {loading
          ? '샘플 준비 중…'
          : failed
            ? '불러오기 실패 · 다시 시도'
          : '샘플 데이터로 바로 실행하기'}
    </Button>
  )
}

export default SampleDocumentsButton
