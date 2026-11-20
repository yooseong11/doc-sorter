import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// 훅 테스트 전용 설정. 기존 tests/*.test.js는 node --test가 실행한다.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.jsx'],
  },
})
