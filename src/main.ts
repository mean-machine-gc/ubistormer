// Initialize Svelte App
import { mount } from 'svelte';
import App from './App.svelte';

console.log('main.ts loading...');

// Mount Svelte app using Svelte 5 syntax
const app = mount(App, {
  target: document.body
});

export default app;