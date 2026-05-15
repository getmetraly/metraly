import { resolve } from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const appNodeModules = (...parts: string[]) => resolve(__dirname, 'node_modules', ...parts);

const reactAliases = {
  react: appNodeModules('react'),
  'react/jsx-runtime': appNodeModules('react', 'jsx-runtime.js'),
  'react/jsx-dev-runtime': appNodeModules('react', 'jsx-dev-runtime.js'),
  'react-dom': appNodeModules('react-dom'),
  'react-dom/client': appNodeModules('react-dom', 'client.js'),
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: reactAliases,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    exclude: [...configDefaults.exclude, 'e2e/**/*.ts'],
  },
});
