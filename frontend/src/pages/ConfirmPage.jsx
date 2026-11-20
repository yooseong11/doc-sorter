import PageShell from '../components/common/PageShell'
import PageHeader from '../components/common/PageHeader'
import { Stat, StatGroup } from '../components/common/Stat'
import InlineNotice from '../components/common/InlineNotice'
import CategoryGroup from '../components/confirm/CategoryGroup'
import ConfirmActionBar from '../components/confirm/ConfirmActionBar'
import { UNCLASSIFIED } from '../../shared/categories.js'
import { groupItems } from '../groupOrder'
import './ConfirmPage.css'

// S2 확인 화면 — 카테고리별로 묶어서 보여주고, 행마다 드롭다운으로 바꾼다. (ADR 0004)
// 실패한 파일도 목록에 남기고 사유와 재시도 버튼을 붙인다. (ADR 0013)

function ConfirmPage({ items: rows, dispatch, preset, busy, onRetry, onBack, onNext }) {
  const groups = groupItems(rows, preset)

  const reviewCount = rows.filter(
    (row) => row.classification.phase.endsWith('-failed')
      || row.classification.categoryId === UNCLASSIFIED,
  ).length

  const allUnclassified =
    rows.length > 0
    && rows.every((row) => row.classification.categoryId === UNCLASSIFIED)

  function handleChangeCategory(id, categoryId) {
    // 리듀서가 검증할 id 목록을 액션에 같이 싣는다. (ADR 0009 · 0019 · 0022)
    const ids = [...preset.categories.map((category) => category.id), UNCLASSIFIED]
    if (!busy) dispatch({ type: 'category', id, categoryId, ids })
  }

  return (
    <PageShell>
      <PageHeader
        title="분류 결과 확인"
        lead={
          <>
            카테고리별로 묶어 두었습니다. 틀린 것만 드롭다운으로 바꾸면 그
            묶음으로 옮겨갑니다. 파일명 줄을 누르면 근거 문장이 펼쳐집니다.
          </>
        }
      >
        <StatGroup>
          <Stat value={rows.length} label="전체" />
          <Stat
            value={reviewCount}
            label="확인 필요"
            tone={reviewCount > 0 ? 'warn' : 'default'}
          />
        </StatGroup>
      </PageHeader>

      {allUnclassified && (
        <InlineNotice>
          분류된 파일이 없습니다. 카테고리 설명을 확인해 주세요.
        </InlineNotice>
      )}

      <div className="confirm__groups">
        {groups.map((group) => (
          <CategoryGroup
            key={group.name}
            group={group}
            preset={preset}
            onChangeCategory={handleChangeCategory}
            onRetry={onRetry}
            disabled={busy}
          />
        ))}
      </div>

      <ConfirmActionBar
        reviewCount={reviewCount}
        busy={busy}
        onBack={onBack}
        onNext={onNext}
      />
    </PageShell>
  )
}

export default ConfirmPage
