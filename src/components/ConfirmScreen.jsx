import { useState } from 'react'
import ResultRow from './ResultRow'
import { GROUP_ORDER, UNCLASSIFIED, hintOf } from '../lib/categories'
import './ConfirmScreen.css'

// S2 확인 화면 — 카테고리별로 묶어서 보여주고, 행마다 드롭다운으로 바꾼다. (ADR 0004)
// 실패한 파일도 목록에 남기고 사유와 재시도 버튼을 붙인다. (ADR 0013)

// TODO(R1): S1의 분류 결과를 props로 받는다. 지금은 화면을 보려고 넣은 예시다.
const DEMO_ITEMS = [
  {
    id: 'demo-1',
    name: '전자세금계산서_9월.pdf',
    size: 182000,
    category: '비용 증빙',
    quote: '공급자 등록번호와 공급가액이 적힌 전자세금계산서입니다.',
    status: 'classified',
  },
  {
    id: 'demo-2',
    name: '출장정산_영수증.pdf',
    size: 96000,
    category: '비용 증빙',
    quote: '9월 출장 교통비와 숙박비 영수증 정산 내역입니다.',
    status: 'classified',
  },
  {
    id: 'demo-3',
    name: '2026-09-01_연차신청서.pdf',
    size: 61000,
    category: '근태',
    quote: '연차 사용 기간과 사유를 적어 제출하는 신청서입니다.',
    status: 'classified',
  },
  {
    id: 'demo-4',
    name: '용역계약서_초안.docx',
    size: 148000,
    category: '계약서',
    quote: '용역의 범위와 대금 지급 시기를 정한 계약 조항입니다.',
    status: 'classified',
  },
  {
    id: 'demo-5',
    name: '사내동호회_지원.hwp',
    size: 54000,
    category: UNCLASSIFIED,
    quote: '',
    status: 'classified',
  },
  {
    id: 'demo-6',
    name: '경조사비_신청.hwpx',
    size: 72000,
    category: UNCLASSIFIED,
    quote: '',
    status: 'failed',
    error: '네트워크 오류로 분류하지 못했습니다.',
  },
]

function ConfirmScreen({ items = DEMO_ITEMS, onBack, onNext }) {
  // TODO(R1): 상태를 App으로 올려 S1·S3와 같은 파일 객체를 쓴다. (ADR 0013)
  const [rows, setRows] = useState(items)

  const groups = GROUP_ORDER.map((name) => ({
    name,
    rows: rows.filter((row) => row.category === name),
  })).filter((group) => group.rows.length > 0)

  const reviewCount = rows.filter(
    (row) => row.status === 'failed' || row.category === UNCLASSIFIED,
  ).length

  const allUnclassified =
    rows.length > 0 && rows.every((row) => row.category === UNCLASSIFIED)

  function handleChangeCategory(id, category) {
    // 사용자가 직접 고른 카테고리는 분류됨으로 본다. (ADR 0013)
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              category,
              status: category === UNCLASSIFIED ? row.status : 'classified',
              error: category === UNCLASSIFIED ? row.error : undefined,
            }
          : row,
      ),
    )
  }

  function handleRetry(id) {
    // TODO(R1): 실패한 파일만 분류 API에 다시 보낸다. 지금은 상태만 바뀐다. (ADR 0013)
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, status: 'classifying' } : row,
      ),
    )
  }

  return (
    <main className="confirm">
      <div className="confirm__glow" aria-hidden="true" />

      <div className="confirm__head">
        <div className="confirm__intro">
          <h1 className="confirm__title">분류 결과 확인</h1>
          <p className="confirm__lead">
            카테고리별로 묶어 두었습니다. 틀린 것만 드롭다운으로 바꾸면 그
            묶음으로 옮겨갑니다. 파일명 줄을 누르면 근거 문장이 펼쳐집니다.
          </p>
        </div>

        <div className="confirm__summary">
          <div className="confirm__stat">
            <span className="confirm__stat-value">{rows.length}</span>
            <span className="confirm__stat-label">전체</span>
          </div>
          <div
            className={`confirm__stat${reviewCount > 0 ? ' confirm__stat--review' : ''}`}
          >
            <span className="confirm__stat-value">{reviewCount}</span>
            <span className="confirm__stat-label">확인 필요</span>
          </div>
        </div>
      </div>

      {allUnclassified && (
        <p className="confirm__notice" role="status">
          분류된 파일이 없습니다. 카테고리 설명을 확인해 주세요.
        </p>
      )}

      <div className="confirm__groups">
        {groups.map((group) => {
          const unclassified = group.name === UNCLASSIFIED
          return (
            <section
              key={group.name}
              className={`confirm__group${unclassified ? ' confirm__group--review' : ''}`}
            >
              <header className="confirm__group-head">
                <h2 className="confirm__group-name">{group.name}</h2>
                <span className="confirm__group-count">
                  {group.rows.length}개
                </span>
                <p className="confirm__group-hint">
                  {unclassified
                    ? '카테고리를 직접 골라 주세요.'
                    : hintOf(group.name)}
                </p>
              </header>

              <ul className="confirm__list">
                {group.rows.map((row) => (
                  <ResultRow
                    key={row.id}
                    item={row}
                    onChangeCategory={handleChangeCategory}
                    onRetry={handleRetry}
                  />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <div className="confirm__bar">
        <p className="confirm__count">
          {reviewCount > 0
            ? `확인이 필요한 파일이 ${reviewCount}개 있습니다`
            : '모두 확인했습니다'}
        </p>

        <div className="confirm__bar-actions">
          <button
            type="button"
            className="confirm__button confirm__button--quiet"
            onClick={onBack}
          >
            파일 다시 고르기
          </button>
          <button type="button" className="confirm__button" onClick={onNext}>
            저장할 폴더 고르기
          </button>
        </div>
      </div>
    </main>
  )
}

export default ConfirmScreen
