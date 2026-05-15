import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'app-dark',
      values: [
        { name: 'app-dark', value: '#0B0F19' },
        { name: 'app-light', value: '#F5F7FA' },
      ],
    },
  },
};

export default preview;
