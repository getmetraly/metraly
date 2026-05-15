import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';

const storybookDir = dirname(fileURLToPath(import.meta.url));
const appNodeModules = (...parts: string[]) => resolve(storybookDir, '..', 'node_modules', ...parts);
const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(ts|tsx)'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: false,
  },
  async viteFinal(config) {
    return {
      ...config,
      resolve: {
        ...(config.resolve ?? {}),
        alias: {
          ...(typeof config.resolve?.alias === 'object' && !Array.isArray(config.resolve.alias)
            ? config.resolve.alias
            : {}),
          react: appNodeModules('react'),
          'react/jsx-runtime': appNodeModules('react', 'jsx-runtime.js'),
          'react/jsx-dev-runtime': appNodeModules('react', 'jsx-dev-runtime.js'),
          'react-dom': appNodeModules('react-dom'),
          'react-dom/client': appNodeModules('react-dom', 'client.js'),
        },
      },
    };
  },
};

export default config;
