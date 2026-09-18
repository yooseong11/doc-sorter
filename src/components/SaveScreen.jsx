import { useEffect, useState } from 'react'
import SaveRow from './SaveRow'
import { GROUP_ORDER, UNCLASSIFIED } from '../lib/categories'
import { logFileName, savePath, withSuffix } from '../lib/savePath'
import './SaveScreen.css'

// S3 저장 화면 — 최상위 폴더를 고르고 카테고리 폴더에 넣은 뒤 기록표를 남긴다.
// 성공분은 되돌리지 않고 실패분만 다시 시도한다. (ADR 0011)
// 미분류도 예외 없이 `미분류` 폴더에 넣는다. (ADR 0014)

// 단독 화면 확인용 기본 예시. App에서는 실제 목록을 전달한다.
const DEMO_ITEMS = [
  { id: 'demo-1', name: '전자세금계산서_9월.pdf', size: 182000, category: '비용 증빙' },
  { id: 'demo-2', name: '출장정산_영수증.pdf', size: 96000, category: '비용 증빙', conflict: true },
  { id: 'demo-3', name: '2026-09-01_연차신청서.pdf', size: 61000, category: '근태' },
  { id: 'demo-4', name: '용역계약서_초안.docx', size: 148000, category: '계약서' },
  { id: 'demo-5', name: '사내동호회_지원.hwp', size: 54000, category: UNCLASSIFIED },
  { id: 'demo-6', name: '경조사비_신청.hwpx', size: 72000, category: UNCLASSIFIED, fails: true },
]

// 저장될 이름과 경로를 미리 계산해 둔다. 같은 이름이면 _2를 붙인다. (ADR 0005)
function prepare(items) {
  return items.map((item) => {
    const savedName = withSuffix(item.name, item.conflict ? 2 : 1)
    return {
      ...item,
      savedName,
      target: savePath(item.category, savedName),
      renamed: Boolean(item.conflict),
      saveStatus: 'waiting',
    }
  })
}

function SaveScreen({ items = DEMO_ITEMS, onBack, onRestart }) {
  const [rows, setRows] = useState(() => prepare(items))
  const [phase, setPhase] = useState('idle')
  const [folder, setFolder] = useState('')
  const [pickError, setPickError] = useState('')

  const savedCount = rows.filter((row) => row.saveStatus === 'saved').length
  const failedCount = rows.filter((row) => row.saveStatus === 'failed').length
  const logName = logFileName()

  const folders = GROUP_ORDER.map((name) => ({
    name,
    count: rows.filter((row) => row.category === name).length,
  })).filter((group) => group.count > 0)

  // 껍데기 저장. 한 줄씩 상태만 바꾼다.
  // TODO(R1): showDirectoryPicker 핸들로 실제 파일을 쓰고 기록표에 한 줄씩 이어 쓴다. (ADR 0011)
  useEffect(() => {
    if (phase !== 'saving') return

    const current = rows.findIndex((row) => row.saveStatus === 'saving')
    if (current >= 0) {
      const timer = setTimeout(() => {
        setRows((prev) =>
          prev.map((row, index) =>
            index === current
              ? {
                  ...row,
                  saveStatus: row.fails ? 'failed' : 'saved',
                  error: row.fails
                    ? '폴더 권한이 회수되어 쓰지 못했습니다.'
                    : undefined,
                }
              : row,
          ),
        )
      }, 420)
      return () => clearTimeout(timer)
    }

    const next = rows.findIndex((row) => row.saveStatus === 'waiting')
    if (next < 0) {
      setPhase('done')
      return
    }
    setRows((prev) =>
      prev.map((row, index) =>
        index === next ? { ...row, saveStatus: 'saving' } : row,
      ),
    )
  }, [phase, rows])

  function handlePickFolder() {
    // TODO(R1): showDirectoryPicker()로 고르고 핸들을 idb-keyval에 기억한다. (ADR 0003)
    // 사용자가 취소하거나 권한을 거부하면 아무것도 만들지 않고 중단한다.
    setPickError('')
    setFolder('바탕화면/경영지원')
  }

  function handleStart() {
    if (!folder) {
      setPickError('폴더를 선택해야 저장할 수 있습니다.')
      return
    }
    setPhase('saving')
  }

  function handleRetryFailed() {
    // 재시도는 실패한 파일만. 이미 저장된 파일은 건드리지 않는다. (ADR 0011)
    setRows((prev) =>
      prev.map((row) =>
        row.saveStatus === 'failed'
          ? { ...row, saveStatus: 'waiting', error: undefined, fails: false }
          : row,
      ),
    )
    setPhase('saving')
  }

  return (
    <main className="save">
      <div className="save__glow" aria-hidden="true" />

      <div className="save__head">
        <div className="save__intro">
          <h1 className="save__title">폴더에 저장</h1>
          <p className="save__lead">
            카테고리 이름이 그대로 하위 폴더가 됩니다. 같은 이름의 파일이 있으면
            덮어쓰지 않고 <code>_2</code>를 붙입니다. 저장한 내역은{' '}
            <code>{logName}</code>에 한 줄씩 남습니다.
          </p>
        </div>

        <div className="save__summary">
          <div className="save__stat">
            <span className="save__stat-value">{rows.length}</span>
            <span className="save__stat-label">전체</span>
          </div>
          {phase !== 'idle' && (
            <div className="save__stat save__stat--ok">
              <span className="save__stat-value">{savedCount}</span>
              <span className="save__stat-label">저장됨</span>
            </div>
          )}
          {failedCount > 0 && (
            <div className="save__stat save__stat--failed">
              <span className="save__stat-value">{failedCount}</span>
              <span className="save__stat-label">실패</span>
            </div>
          )}
        </div>
      </div>

      <section className="save__folder">
        <div className="save__folder-main">
          <span className="save__folder-label">최상위 폴더</span>
          <span className={`save__folder-path${folder ? '' : ' save__folder-path--empty'}`}>
            {folder || '아직 고르지 않았습니다'}
          </span>
        </div>
        <button
          type="button"
          className="save__button save__button--quiet"
          onClick={handlePickFolder}
          disabled={phase === 'saving'}
        >
          {folder ? '폴더 바꾸기' : '폴더 고르기'}
        </button>
      </section>

      {pickError && (
        <p className="save__notice" role="status">
          {pickError}
        </p>
      )}

      {phase === 'idle' ? (
        <section className="save__plan">
          <header className="save__plan-head">
            <h2 className="save__plan-title">이렇게 들어갑니다</h2>
            <span className="save__plan-hint">
              이미 있는 폴더는 새로 만들지 않고 그대로 씁니다
            </span>
          </header>
          <ul className="save__tree">
            {folders.map((group) => (
              <li
                key={group.name}
                className={`save__tree-item${group.name === UNCLASSIFIED ? ' save__tree-item--review' : ''}`}
              >
                <span className="save__tree-name">{group.name}/</span>
                <span className="save__tree-count">{group.count}개</span>
                {group.name === UNCLASSIFIED && (
                  <span className="save__tree-note">
                    확인이 필요한 파일도 폴더 하나에 모읍니다
                  </span>
                )}
              </li>
            ))}
            <li className="save__tree-item save__tree-item--log">
              <span className="save__tree-name">{logName}</span>
              <span className="save__tree-note">
                같은 날 다시 저장하면 이어 씁니다
              </span>
            </li>
          </ul>
        </section>
      ) : (
        <section className="save__list-card">
          <ul className="save__list">
            {rows.map((row) => (
              <SaveRow key={row.id} item={row} onRetry={handleRetryFailed} />
            ))}
          </ul>
        </section>
      )}

      <div className="save__bar">
        <p className="save__count">
          {phase === 'idle' && `${rows.length}개를 ${folders.length}개 폴더에 나눠 넣습니다`}
          {phase === 'saving' && '저장하는 중입니다. 창을 닫지 마세요'}
          {phase === 'done' &&
            (failedCount > 0
              ? `${savedCount}개 저장됨 · ${failedCount}개 실패`
              : `${savedCount}개를 모두 저장했습니다`)}
        </p>

        <div className="save__bar-actions">
          {phase === 'done' ? (
            <>
              {failedCount > 0 && (
                <button
                  type="button"
                  className="save__button save__button--quiet"
                  onClick={handleRetryFailed}
                >
                  실패분 다시 시도
                </button>
              )}
              <button type="button" className="save__button" onClick={onRestart}>
                새 파일 분류하기
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="save__button save__button--quiet"
                onClick={onBack}
                disabled={phase === 'saving'}
              >
                확인 화면으로
              </button>
              <button
                type="button"
                className="save__button"
                onClick={handleStart}
                disabled={phase === 'saving' || !folder}
              >
                저장 시작
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default SaveScreen
