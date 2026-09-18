import { useState } from 'react'
import UploadScreen from './components/UploadScreen'
import ConfirmScreen from './components/ConfirmScreen'
import './App.css'

// TODO(R1): S1에서 분류가 끝나면 S2로 넘어가게 잇는다. (ADR 0013)
// 그때까지 확인 화면은 주소 끝에 #s2를 붙여서 본다. (예: localhost:5173/#s2)
function initialScreen() {
  if (typeof window === 'undefined') return 's1'
  return window.location.hash === '#s2' ? 's2' : 's1'
}

function App() {
  const [screen, setScreen] = useState(initialScreen)

  return (
    <div className="app">
      {screen === 's1' ? (
        <UploadScreen />
      ) : (
        <ConfirmScreen onBack={() => setScreen('s1')} />
      )}
    </div>
  )
}

export default App
