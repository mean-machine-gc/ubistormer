import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    enableSourcemap: true,
  },
  vitePlugin: {
    include: ['src/**/*.svelte'],
  },
};