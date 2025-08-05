import { defineConfig } from 'vite';
import { resolve } from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { tooltipSavePlugin } from './src/api/vite-save-plugin.ts';
import { aiBridgePlugin } from './src/api/ai-bridge-plugin.ts';
import { eventStormingBridgePlugin } from './src/api/eventstorming-bridge-plugin.ts';

export default defineConfig({
  plugins: [svelte(), tooltipSavePlugin(), aiBridgePlugin(), eventStormingBridgePlugin()],
  server: {
    port: 3002,
    open: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  publicDir: false,
  optimizeDeps: {
    include: [
      'monaco-editor',
      'monaco-editor/esm/vs/editor/editor.worker',
      'monaco-editor/esm/vs/language/typescript/ts.worker'
    ]
  },
  worker: {
    format: 'es'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});