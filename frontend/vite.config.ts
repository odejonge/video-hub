import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['.nip.io', '.sslip.io', '.alles.onl', '.diejongen.nl', '.ngrok-free.app', '.ngrok-free.dev', '.localhost'], // Allow wildcard DNS services
  },
})


