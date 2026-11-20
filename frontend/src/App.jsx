import { useMemo, useReducer, useState } from 'react'
import { Navigate, Route, Routes, useBlocker, useNavigate } from 'react-router'
import UploadPage from './pages/UploadPage'
import ConfirmPage from './pages/ConfirmPage'
import SavePage from './pages/SavePage'
import { documentsReducer } from './lib/state/documentsReducer'
import { useClassification } from './lib/state/useClassification'
import { categoryPreset } from '../shared/categories.js'
import { useCategories } from './lib/state/useCategories'
import './App.css'

function App() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [items, dispatch] = useReducer(documentsReducer, [])
  // 편집 가능한 목록이 원본이고, 화면과 계약이 쓰는 조회는 전부 여기서 파생시킨다. (ADR 0019)
  // 편집 중 행을 구분할 id. 계약에는 싣지 않는다. buildClassificationInput이 걸러낸다. (ADR 0008)
  const [categories, setCategories] = useCategories()
  const preset = useMemo(() => categoryPreset(categories), [categories])
  const { busy, runClassification } = useClassification({
    items, dispatch, preset, onComplete: () => navigate('/confirm'),
  })

  // 처리 중에는 브라우저 뒤로 가기도 막아 실행 중인 화면을 유지한다.
  useBlocker(({ historyAction }) => historyAction === 'POP' && (busy || saving))

  const canReview = items.length > 0 && items.every((item) =>
    !['reading', 'ready', 'waiting'].includes(item.classification.phase),
  )

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<UploadPage items={items} dispatch={dispatch} categories={categories} onCategoriesChange={setCategories} classifying={busy} onClassify={() => runClassification()} />} />
        <Route path="/confirm" element={canReview
          ? <ConfirmPage items={items} dispatch={dispatch} preset={preset} busy={busy} onRetry={runClassification} onBack={() => navigate('/')} onNext={() => navigate('/save')} />
          : <Navigate to="/" replace />} />
        <Route path="/save" element={canReview
          ? <SavePage items={items} dispatch={dispatch} preset={preset} onSavingChange={setSaving} onBack={() => navigate('/confirm')} onRestart={() => { dispatch({ type: 'reset' }); navigate('/', { replace: true }) }} />
          : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

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
