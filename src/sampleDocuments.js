import { CATEGORY_OPTIONS } from '../shared/categories.js'

const samples = [
  {
    fileName: '세금계산서_프롬프트인젝션.pdf',
    url: '/samples/세금계산서_프롬프트인젝션.pdf',
    expectedCategory: '비용 증빙',
  },
  {
    fileName: 'KakaoTalk_20260918_1432.pdf',
    url: '/samples/KakaoTalk_20260918_1432.pdf',
    expectedCategory: '근태',
  },
  {
    fileName: '국민연금_보험료_고지서.pdf',
    url: '/samples/국민연금_보험료_고지서.pdf',
    expectedCategory: '미분류',
  },
  {
    fileName: '로고디자인_용역계약서.pdf',
    url: '/samples/로고디자인_용역계약서.pdf',
    expectedCategory: '계약서',
  },
  {
    fileName: '복지포인트_도서구입_신청서.docx',
    url: '/samples/복지포인트_도서구입_신청서.docx',
    expectedCategory: '복지 신청',
  },
]

export const SAMPLE_DOCUMENTS = samples.map((sample) => {
  if (!CATEGORY_OPTIONS.includes(sample.expectedCategory)) {
    throw new Error(`알 수 없는 샘플 기대 카테고리: ${sample.expectedCategory}`)
  }

  return Object.freeze(sample)
})
