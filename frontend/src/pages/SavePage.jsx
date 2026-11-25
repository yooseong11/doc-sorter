import PageShell from '../components/common/PageShell'
import PageHeader from '../components/common/PageHeader'
import { Stat, StatGroup } from '../components/common/Stat'
import InlineNotice from '../components/common/InlineNotice'
import SaveFolderPicker from '../components/save/SaveFolderPicker'
import SavePlanTree from '../components/save/SavePlanTree'
import SaveList from '../components/save/SaveList'
import SaveActionBar from '../components/save/SaveActionBar'
import { useSaveFlow } from '../hooks/useSaveFlow'
import { SAVE_FLOW_PHASE } from '../lib/state/savePhases'
import './SavePage.css'

// S3 저장 화면 — 최상위 폴더를 고르고 카테고리 폴더에 넣은 뒤 기록표를 남긴다.
// 성공분은 되돌리지 않고 실패분만 다시 시도한다. (ADR 0011 · 0013)
// 미분류도 예외 없이 `미분류` 폴더에 넣는다. (ADR 0014)

function SavePage({ items, dispatch, preset, onBack, onRestart, onSavingChange }) {
  const {
    phase,
    notice,
    folder,
    logName,
    savedCount,
    failedCount,
    folders,
    countText,
    pickFolder,
    retryFailed,
    save,
  } = useSaveFlow({ items, dispatch, preset, onSavingChange })

  return (
    <PageShell>
      <PageHeader
        title="폴더에 저장"
        lead={
          <>
            카테고리 이름이 그대로 하위 폴더가 됩니다. 같은 이름의 파일이 있으면
            덮어쓰지 않고 <code>_2</code>를 붙입니다. 저장한 내역은{' '}
            <code>{logName}</code>에 한 줄씩 남습니다.
          </>
        }
      >
        <StatGroup>
          <Stat value={items.length} label="전체" />
          {(phase === SAVE_FLOW_PHASE.SAVING || phase === SAVE_FLOW_PHASE.DONE) && (
            <Stat value={savedCount} label="저장됨" tone="ok" />
          )}
          {failedCount > 0 && (
            <Stat value={failedCount} label="실패" tone="danger" />
          )}
        </StatGroup>
      </PageHeader>

      <SaveFolderPicker
        folder={folder}
        saving={phase === SAVE_FLOW_PHASE.SAVING}
        onPick={pickFolder}
      />

      {notice && <InlineNotice>{notice}</InlineNotice>}

      {phase === SAVE_FLOW_PHASE.IDLE ? (
        <SavePlanTree folders={folders} logName={logName} />
      ) : (
        <SaveList items={items} onRetry={retryFailed} />
      )}

      <SaveActionBar
        phase={phase}
        failedCount={failedCount}
        canSave={Boolean(folder)}
        count={countText}
        onRetry={() => retryFailed()}
        onRestart={onRestart}
        onBack={onBack}
        onSave={() => save(items)}
      />
    </PageShell>
  )
}

export default SavePage
