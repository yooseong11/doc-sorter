import { SAMPLE_DOCUMENTS } from './sampleDocuments.js'

async function fetchSample(sample) {
  const response = await fetch(sample.url)
  if (!response.ok) throw new Error(`샘플을 불러오지 못했습니다: ${sample.fileName}`)
  const blob = await response.blob()
  return new File([blob], sample.fileName, { type: blob.type })
}

export function loadSampleDocuments() {
  return Promise.all(SAMPLE_DOCUMENTS.map(fetchSample))
}
