import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const baseAllowedHosts = ['localhost', '127.0.0.1', '.munistream.com', '.paw.mx']

const allowedHosts = Array.from(
  new Set(
    [
      ...baseAllowedHosts,
      ...((process.env.VITE_ALLOWED_HOSTS ?? '')
        .split(',')
        .map((host) => host.trim())
        .filter(Boolean)),
    ],
  ),
)

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_PORT ?? 5173),
    allowedHosts,
  },
})
