import { useState } from 'react'
import UploadScreen from './components/UploadScreen'
import ConfirmScreen from './components/ConfirmScreen'
import SaveScreen from './components/SaveScreen'
import './App.css'

// TODO(R1): S1 → S2 → S3를 실제 파일 목록으로 잇는다. (ADR 0013)
// 그때까지 각 화면은 주소 끝의 해시로 본다. (예: localhost:5173/#s3)
function initialScreen() {
  if (typeof window === 'undefined') return 's1'
  const hash = window.location.hash
  if (hash === '#s2') return 's2'
  if (hash === '#s3') return 's3'
  return 's1'
}

function App() {
  const [screen, setScreen] = useState(initialScreen)

  return (
    <div className="app">
      {screen === 's1' && <UploadScreen />}
      {screen === 's2' && (
        <ConfirmScreen
          onBack={() => setScreen('s1')}
          onNext={() => setScreen('s3')}
        />
      )}
      {screen === 's3' && (
        <SaveScreen
          onBack={() => setScreen('s2')}
          onRestart={() => setScreen('s1')}
        />
      )}
    </div>
  )
}

export default App
