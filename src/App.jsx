import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import UploadScreen from './components/UploadScreen'
import ConfirmScreen from './components/ConfirmScreen'
import SaveScreen from './components/SaveScreen'
import { documentsReducer } from './lib/state/documentsReducer'
import { classifyDocuments } from './lib/state/runDocuments'
import { categoryPreset } from '../shared/categories.js'
import { defaultCategories, recallCategories, rememberCategories } from './lib/state/categoryStore'
import './App.css'

function App() {
  const [screen, setScreen] = useState('s1')
  const [items, dispatch] = useReducer(documentsReducer, [])
  // 편집 가능한 목록이 원본이고, 화면과 계약이 쓰는 조회는 전부 여기서 파생시킨다. (ADR 0019)
  // 편집 중 행을 구분할 id. 계약에는 싣지 않는다. buildClassificationInput이 걸러낸다. (ADR 0008)
  const [categories, setCategories] = useState(defaultCategories)
  // 저장된 프리셋을 읽기 전에는 저장하지 않는다. 기본값으로 덮어쓰게 된다.
  const loaded = useRef(false)
  const preset = useMemo(() => categoryPreset(categories), [categories])
  const [busy, setBusy] = useState(false)
  const running = useRef(false)

  // 저장된 프리셋을 한 번 읽는다. 없거나 계약에 맞지 않으면 기본값을 그대로 쓴다. (ADR 0021)
  useEffect(() => {
    let alive = true
    void recallCategories().then((stored) => {
      if (alive && stored) setCategories(stored)
      loaded.current = true
    })
    return () => { alive = false }
  }, [])

  // 입력이 멈춘 뒤에 쓴다. 타이핑 한 글자마다 디스크를 건드리지 않는다. (ADR 0021)
  useEffect(() => {
    if (!loaded.current) return
    const timer = setTimeout(() => { void rememberCategories(categories) }, 500)
    return () => clearTimeout(timer)
  }, [categories])

  async function runClassification(id) {
    if (running.current || items.some((item) => item.classification.phase === 'reading')) return
    running.current = true
    setBusy(true)
    try {
      await classifyDocuments(id ? items.filter((item) => item.source.id === id) : items, {
        dispatch, preset, retry: Boolean(id),
      })
      setScreen('s2')
    } finally {
      running.current = false
      setBusy(false)
    }
  }

  return (
    <div className="app">
      {screen === 's1' && <UploadScreen items={items} dispatch={dispatch} categories={categories} onCategoriesChange={setCategories} classifying={busy} onClassify={() => runClassification()} />}
      {screen === 's2' && <ConfirmScreen items={items} dispatch={dispatch} preset={preset} busy={busy} onRetry={runClassification} onBack={() => setScreen('s1')} onNext={() => setScreen('s3')} />}
      {screen === 's3' && <SaveScreen items={items} dispatch={dispatch} preset={preset} onBack={() => setScreen('s2')} onRestart={() => { dispatch({ type: 'reset' }); setScreen('s1') }} />}

      <a
        className="app__github-link"
        href="https://github.com/yooseong11/doc-sorter"
        target="_blank"
        rel="noreferrer"
      >
        <span className="app__github-icon" aria-hidden="true">
          <svg viewBox="0 0 19 19" width="20" height="20">
            <use href="/icons.svg#github-icon" />
          </svg>
        </span>
        <span className="app__github-copy">
          <strong>제작 과정 살펴보기</strong>
          <span>기획·AI활용방법·코드를 구경해보세요!</span>
        </span>
      </a>
    </div>
  )
}
export default App
