#!/usr/bin/env node

/**
 * Ubistorming CLI
 * 
 * Start the EventStorming UI with: npx ubistorming
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the Vite dev server
const viteProcess = spawn('npx', ['vite'], {
  cwd: resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

viteProcess.on('error', (error) => {
  console.error('Failed to start Ubistorming:', error);
  process.exit(1);
});

viteProcess.on('close', (code) => {
  process.exit(code || 0);
});

// Handle process termination
process.on('SIGINT', () => {
  viteProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  viteProcess.kill('SIGTERM');
});