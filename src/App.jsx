import { useReducer, useRef, useState } from 'react'
import UploadScreen from './components/UploadScreen'
import ConfirmScreen from './components/ConfirmScreen'
import SaveScreen from './components/SaveScreen'
import { documentsReducer } from './lib/state/documentsReducer'
import { classifyDocuments } from './lib/state/runDocuments'
import './App.css'

function App() {
  const [screen, setScreen] = useState('s1')
  const [items, dispatch] = useReducer(documentsReducer, [])
  const [busy, setBusy] = useState(false)
  const running = useRef(false)

  async function runClassification(id) {
    if (running.current || items.some((item) => item.classification.phase === 'reading')) return
    running.current = true
    setBusy(true)
    try {
      await classifyDocuments(id ? items.filter((item) => item.source.id === id) : items, {
        dispatch, retry: Boolean(id),
      })
      setScreen('s2')
    } finally {
      running.current = false
      setBusy(false)
    }
  }

  return (
    <div className="app">
      {screen === 's1' && <UploadScreen items={items} dispatch={dispatch} classifying={busy} onClassify={() => runClassification()} />}
      {screen === 's2' && <ConfirmScreen items={items} dispatch={dispatch} busy={busy} onRetry={runClassification} onBack={() => setScreen('s1')} onNext={() => setScreen('s3')} />}
      {screen === 's3' && <SaveScreen items={items} dispatch={dispatch} onBack={() => setScreen('s2')} onRestart={() => { dispatch({ type: 'reset' }); setScreen('s1') }} />}

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
