import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { devApi } from './server/devApi.js'

export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi({ ...loadEnv(mode, process.cwd(), ''), ...process.env })],
}))
