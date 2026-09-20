import { useEffect, useRef, useState } from 'react'
import SaveRow from './SaveRow'
import { UNCLASSIFIED } from '../../shared/categories.js'
import { groupOrderOf } from '../groupOrder'
import { logFileName } from '../lib/save/savePath'
import { planSaves } from '../lib/save/savePlan'
import { saveAll } from '../lib/save/saveFiles'
import {
  ensurePermission,
  folderLabel,
  pickRootDirectory,
  recallDirectory,
  rememberDirectory,
} from '../lib/save/saveFolder'
import './SaveScreen.css'

// S3 저장 화면 — 최상위 폴더를 고르고 카테고리 폴더에 넣은 뒤 기록표를 남긴다.
// 성공분은 되돌리지 않고 실패분만 다시 시도한다. (ADR 0011 · 0013)
// 미분류도 예외 없이 `미분류` 폴더에 넣는다. (ADR 0014)

function SaveScreen({ items, dispatch, preset, onBack, onRestart }) {
  const [phase, setPhase] = useState('idle')
  const [notice, setNotice] = useState('')
  const [folder, setFolder] = useState('')
  const rootRef = useRef(null)
  const alive = useRef(true)
  const logName = logFileName()

  const savedCount = items.filter((item) => item.save.phase === 'saved').length
  const failedCount = items.filter((item) => item.save.phase.endsWith('-failed')).length

  const folders = groupOrderOf(preset).map((name) => ({
    name,
    count: items.filter((item) => item.classification.category === name).length,
  })).filter((group) => group.count > 0)

  // StrictMode는 effect를 두 번 실행한다. 되살리는 것도 여기서 해야 한다.
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // 지난번에 고른 폴더를 그대로 쓴다. 권한이 남아 있을 때만 복원한다. (ADR 0003)
  useEffect(() => {
    let cancelled = false
    recallDirectory().then((handle) => {
      if (cancelled || !handle) return
      rootRef.current = handle
      setFolder(folderLabel(handle))
    })
    return () => {
      cancelled = true
    }
    // 처음 열 때만 확인한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handlePickFolder() {
    setNotice('')
    const handle = await pickRootDirectory()
    if (!handle) {
      // 취소·권한 거부. 아무것도 만들지 않고 확인 화면 상태를 그대로 둔다. (ADR 0003)
      setNotice('폴더를 선택해야 저장할 수 있습니다.')
      return
    }
    if (!(await ensurePermission(handle))) {
      setNotice('폴더에 쓸 권한이 없습니다. 다른 폴더를 골라 주세요.')
      return
    }

    rootRef.current = handle
    setFolder(folderLabel(handle))
    await rememberDirectory(handle)
  }

  // 저장 직전에 이름을 확정한다. 그때 폴더에 무엇이 있는지 알 수 있기 때문이다. (ADR 0005)
  async function runSave(targets) {
    const rootHandle = rootRef.current
    if (!rootHandle) {
      setNotice('폴더를 선택해야 저장할 수 있습니다.')
      return
    }
    setNotice('')
    setPhase('saving')

    const onRow = (id, patch) => {
      if (alive.current) dispatch({ type: 'save', id, patch })
    }
    try {
      // 저장될 이름을 먼저 목록에 반영한다. 대기 중인 줄에도 `_2`가 보인다. (ADR 0005)
      const planned = await planSaves(targets, rootHandle)
      dispatch({ type: 'plan', rows: planned })
      await saveAll(planned, { rootHandle, onRow, logName })
    } finally {
      if (alive.current) setPhase('done')
    }
  }

  // 재시도는 실패한 파일만. 저장된 파일은 그대로 둔다. (ADR 0011)
  async function handleRetryFailed(id) {
    const failed = items.filter(
      (item) => item.save.phase.endsWith('-failed') && (!id || item.source.id === id),
    )
    await runSave(failed)
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
            <span className="save__stat-value">{items.length}</span>
            <span className="save__stat-label">전체</span>
          </div>
          {(phase === 'saving' || phase === 'done') && (
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

      {notice && (
        <p className="save__notice" role="status">
          {notice}
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
            {items.map((row) => (
              <SaveRow key={row.source.id} item={row} onRetry={handleRetryFailed} />
            ))}
          </ul>
        </section>
      )}

      <div className="save__bar">
        <p className="save__count">
          {phase === 'idle' &&
            `${items.length}개를 ${folders.length}개 폴더에 나눠 넣습니다`}
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
                  onClick={() => handleRetryFailed()}
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
                onClick={() => runSave(items)}
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
