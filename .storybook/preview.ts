import type { Preview } from '@storybook/react-vite'

// WebGL polyfill for Storybook environment
if (typeof global !== 'undefined') {
  global.WebGLRenderingContext = global.WebGLRenderingContext || {}
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#1a1a1a',
        },
        {
          name: 'light',
          value: '#ffffff',
        },
      ],
    },
  },
};

export default preview;