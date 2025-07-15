import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  "framework": {
    "name": "@storybook/react-vite",
    "options": {
      viteConfigPath: "../vite.config.ts"
    }
  },
  "viteFinal": async (config) => {
    // Optimize for PixiJS and WebGL in Storybook
    config.define = {
      ...config.define,
      'import.meta.env.STORYBOOK': true
    }
    return config
  }
};
export default config;