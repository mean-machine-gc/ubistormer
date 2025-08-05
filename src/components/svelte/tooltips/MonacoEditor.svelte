<script>
  import { onMount, onDestroy } from 'svelte';
  
  export let editorId;
  export let language = 'typescript';
  export let value = '';
  export let height = '300px';
  export let flexible = false;
  export let readOnly = false;
  export let theme = 'vs-dark';
  export let onChange = () => {};
  
  let container;
  let editor;
  let monaco;
  let resizeObserver;
  
  onMount(async () => {
    // Wait for global Monaco to be ready
    if (!window.monaco) {
      await new Promise(resolve => {
        if (window.MonacoReady) {
          resolve();
        } else {
          window.addEventListener('monaco-ready', resolve, { once: true });
        }
      });
    }
    
    monaco = window.monaco;
    
    // Create the editor
    editor = monaco.editor.create(container, {
      value,
      language,
      theme,
      readOnly,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 12,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      suggestOnTriggerCharacters: true,
      tabSize: 2
    });
    
    // Add resize observer to handle manual resizing
    resizeObserver = new ResizeObserver((entries) => {
      if (editor) {
        // Force layout with a small delay to ensure proper sizing
        requestAnimationFrame(() => {
          editor.layout();
        });
      }
    });
    resizeObserver.observe(container);
    
    // Listen for changes
    editor.onDidChangeModelContent(() => {
      onChange(editor.getValue());
    });
  });
  
  onDestroy(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    if (editor) {
      editor.dispose();
    }
  });
  
  // Update editor value when prop changes
  $: if (editor && value !== editor.getValue()) {
    editor.setValue(value);
  }
  
  // Update readonly state
  $: if (editor) {
    editor.updateOptions({ readOnly });
  }
</script>

<div 
  bind:this={container} 
  class="monaco-editor-container {flexible ? 'flexible' : ''}" 
  style="{flexible ? '' : `height: ${height};`}"
></div>

<style>
  .monaco-editor-container {
    border: 1px solid #444;
    min-height: 200px;
  }
  
  .monaco-editor-container.flexible {
    flex: 1;
    min-height: 30px;
  }
</style>