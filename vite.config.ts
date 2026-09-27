import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const apiPort = process.env.PORT || fileEnv.PORT || '8787'

  return {
    plugins: [react()],
    server: {
      proxy: { '/api': `http://127.0.0.1:${apiPort}` },
    },
  }
})
