import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const disableHmr = process.env.DISABLE_HMR === 'true'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  root: path.resolve(__dirname, 'frontend'),
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'antd',
      '@ant-design/icons',
      'framer-motion',
      'gsap',
      'gsap/ScrollTrigger',
      '@gsap/react',
      'swiper',
      'swiper/react',
      'swiper/modules',
      'react-icons/fi',
      'react-icons/fa',
      'three',
    ],
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons', '@ant-design/v5-patch-for-react-19'],
          'vendor-three': ['three'],
          'vendor-motion': ['framer-motion', 'motion'],
          'vendor-gsap': ['gsap', '@gsap/react'],
          'vendor-swiper': ['swiper'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-xlsx': ['xlsx', 'file-saver'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    hmr: disableHmr ? false : undefined,
  }
})
