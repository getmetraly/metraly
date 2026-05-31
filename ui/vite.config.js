import { resolve, dirname } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appNodeModules = (...parts) => resolve(__dirname, 'node_modules', ...parts);

const reactAliases = {
  react: appNodeModules('react'),
  'react/jsx-runtime': appNodeModules('react', 'jsx-runtime.js'),
  'react/jsx-dev-runtime': appNodeModules('react', 'jsx-dev-runtime.js'),
  'react-dom': appNodeModules('react-dom'),
  'react-dom/client': appNodeModules('react-dom', 'client.js'),
  'recharts': appNodeModules('recharts', 'es6'),
};
const workspaceRoot = resolve(__dirname, '..', '..');
const brandbookUiRoot = resolve(__dirname, '..', '..', '..', 'brandbook', 'packages', 'ui');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: reactAliases,
    preserveSymlinks: true,
    dedupe: ['react', 'react-dom', 'recharts'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: ['ui'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true,
    },
    fs: {
      allow: [workspaceRoot, brandbookUiRoot, dirname(appNodeModules('react'))],
    },
  },
});
