import document0Url from './documents/세금계산서_프롬프트인젝션.pdf?url&no-inline'
import document1Url from './documents/KakaoTalk_20260918_1432.pdf?url&no-inline'
import document2Url from './documents/출석인정신청서.hwpx?url&no-inline'
import document3Url from './documents/로고디자인_용역계약서.pdf?url&no-inline'
import document4Url from './documents/복지포인트_도서구입_신청서.docx?url&no-inline'
import { categoryPreset } from '../shared/categories.js'

// 샘플은 기본 카테고리에 맞춰 만든 고정 데이터다.
// 사용자가 고친 런타임 목록이 아니라 기본 프리셋으로 확인한다. (ADR 0019)
const defaultPreset = categoryPreset()

const samples = [
  {
    fileName: '세금계산서_프롬프트인젝션.pdf',
    url: document0Url,
    expectedCategory: '비용 증빙',
  },
  {
    fileName: 'KakaoTalk_20260918_1432.pdf',
    url: document1Url,
    expectedCategory: '근태',
  },
  {
    fileName: '출석인정신청서.hwpx',
    url: document2Url,
    expectedCategory: '근태',
  },
  {
    fileName: '로고디자인_용역계약서.pdf',
    url: document3Url,
    expectedCategory: '계약서',
  },
  {
    fileName: '복지포인트_도서구입_신청서.docx',
    url: document4Url,
    expectedCategory: '복지 신청',
  },
]

export const SAMPLE_DOCUMENTS = samples.map((sample) => {
  if (!defaultPreset.has(sample.expectedCategory)) {
    throw new Error(`알 수 없는 샘플 기대 카테고리: ${sample.expectedCategory}`)
  }

  return Object.freeze(sample)
})
