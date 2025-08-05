import { writable, derived } from 'svelte/store';

// Types for settings
export interface SettingsStatus {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  visible: boolean;
}

export type LayoutType = 'timeline' | 'grid' | 'circle' | 'breadthfirst';

// Settings panel state
export const isSettingsVisible = writable<boolean>(false);
export const currentPath = writable<string>('/Users/giovanni/PROJ/webhook/webhook-narrative.json');
export const settingsStatus = writable<SettingsStatus>({ message: '', type: 'info', visible: false });

// Layout state
export const currentLayout = writable<LayoutType>('timeline');

// Initialize from localStorage
if (typeof window !== 'undefined') {
  const storedPath = localStorage.getItem('ubistorming-json-path');
  if (storedPath) {
    currentPath.set(storedPath);
  }
}

// Auto-save path to localStorage
currentPath.subscribe(path => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ubistorming-json-path', path);
  }
});

// Derived store for path display name
export const pathDisplayName = derived(
  currentPath,
  $path => $path.split('/').pop()?.replace('.json', '') || 'unnamed'
);

// Helper functions
export function showSettingsStatus(message, type = 'info', duration = 3000) {
  settingsStatus.set({ message, type, visible: true });
  
  if (duration > 0) {
    setTimeout(() => {
      settingsStatus.update(status => ({ ...status, visible: false }));
    }, duration);
  }
}

export function toggleSettings() {
  isSettingsVisible.update(visible => !visible);
}

export function hideSettings() {
  isSettingsVisible.set(false);
}