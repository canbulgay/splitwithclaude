import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@splitwise/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for faster builds in production
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunks (stable, rarely change)
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          
          // Large libraries in separate chunks
          'charts': ['recharts'],
          'query': ['@tanstack/react-query'],
          
          // UI library chunks (frequently used together)
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs'
          ],
          
          // Form handling (used together)
          'forms': ['react-hook-form', '@hookform/resolvers'],
          
          // Utilities (small, stable)
          'utils': ['clsx', 'tailwind-merge', 'date-fns', 'lucide-react'],
          
          // HTTP and validation
          'api-utils': ['axios', 'zod'],
        },
        // Optimize asset naming for better caching
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    // Optimize build performance
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        safari10: true, // Handle Safari 10 bug
      },
    },
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Optimize CSS
    cssCodeSplit: true,
    // Rollup optimizations
    reportCompressedSize: false, // Skip gzip size reporting for faster builds
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})