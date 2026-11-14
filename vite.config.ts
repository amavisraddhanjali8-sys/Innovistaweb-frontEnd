import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const disableHmr = process.env.DISABLE_HMR === 'true'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
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
