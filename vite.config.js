import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',  // أو '/' حسب احتياجك
  build: {
    outDir: 'dist',  // هذا هو المجلد الافتراضي
  }
})