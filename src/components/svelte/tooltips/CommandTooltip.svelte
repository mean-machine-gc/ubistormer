<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import BaseTooltip from './BaseTooltip.svelte';
  import MonacoEditor from './MonacoEditor.svelte';
  import { marked } from 'marked';
  
  export let nodeId = '';
  export let nodeLabel = '';
  export let visible = false;
  export let position = { x: 100, y: 100 };
  export let businessContext = '';
  export let coreCommand = '';
  export let shellCommand = '';
  export let hydrationFunction = '';
  export let context = null;
  
  const dispatch = createEventDispatcher();
  
  let activeTab = 'code';
  let savedIndicator = false;
  let hydrationHeight = 200; // Default height in pixels
  let isResizing = false;
  let resizeHandle;
  let gridContainer;
  
  // Track editor values
  $: businessContextValue = businessContext || getDefaultBusinessContext();
  $: coreCommandValue = coreCommand || getDefaultCoreCommand();
  $: shellCommandValue = shellCommand || getDefaultShellCommand();
  $: hydrationValue = hydrationFunction || getDefaultHydration();
  
  function getDefaultBusinessContext() {
    return `# ${nodeLabel}

## Business Context

Describe the business context and rules for this command...

## Key Considerations

- What triggers this command?
- What are the business rules?
- What are the expected outcomes?
`;
  }
  
  function getDefaultCoreCommand() {
    return `// Core command type definition
export type ${nodeLabel} = {
  type: "${nodeId}";
  data: {
    // Define command payload here
  };
};`;
  }
  
  function getDefaultShellCommand() {
    return `import { ${nodeLabel} } from './core-command';

// Shell command with additional metadata
export type ${nodeLabel}Shell = ${nodeLabel} & {
  meta: {
    userId: string;
    timestamp: number;
    // Additional metadata
  };
};`;
  }
  
  function getDefaultHydration() {
    return `import { ${nodeLabel} } from './core-command';
import { ${nodeLabel}Shell } from './shell-command';

// Hydrate shell command from core command
export function hydrate${nodeLabel}(
  cmd: ${nodeLabel},
  context: { userId: string }
): ${nodeLabel}Shell {
  return {
    ...cmd,
    meta: {
      userId: context.userId,
      timestamp: Date.now()
    }
  };
}`;
  }
  
  function switchTab(tab) {
    activeTab = tab;
  }
  
  async function handleSave() {
    const changes = {
      nodeId,
      businessContext: businessContextValue,
      coreCommand: coreCommandValue,
      shellCommand: shellCommandValue,
      hydrationFunction: hydrationValue
    };
    
    // Try to save via API
    try {
      const response = await fetch('/api/tooltip-save/save-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          updatedFields: {
            businessContext: businessContextValue,
            coreCommand: coreCommandValue,
            shellCommand: shellCommandValue,
            hydrationFunction: hydrationValue
          }
        })
      });
      
      if (!response.ok) throw new Error('API save failed');
      
      console.log('✅ Saved to JSON file');
    } catch (error) {
      // Fallback to localStorage
      const storageKey = `tooltip-changes-${nodeId}`;
      localStorage.setItem(storageKey, JSON.stringify(changes));
      console.log('💾 Saved to localStorage');
    }
    
    // Show saved indicator
    savedIndicator = true;
    setTimeout(() => savedIndicator = false, 2000);
    
    dispatch('save', changes);
  }
  
  function handleClose() {
    visible = false;
    dispatch('close');
  }
  
  onMount(() => {
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', startResize);
    }
  });
  
  function startResize(e) {
    isResizing = true;
    const startY = e.clientY;
    const startHeight = hydrationHeight;
    
    function handleMouseMove(e) {
      if (!isResizing) return;
      
      const deltaY = startY - e.clientY; // Inverted because we want to grow upward
      const newHeight = Math.max(150, Math.min(400, startHeight + deltaY));
      hydrationHeight = newHeight;
    }
    
    function handleMouseUp() {
      isResizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  }
  
  $: markdownPreview = marked(businessContextValue);
</script>

<BaseTooltip
  id="command-tooltip-{nodeId}"
  title="Command: {nodeLabel}"
  bind:visible
  {position}
  width="800px"
  minHeight="500px"
  on:close={handleClose}
>
  <div class="monaco-tooltip-tabs">
    <button 
      class="monaco-tooltip-tab {activeTab === 'business' ? 'active' : ''}"
      on:click={() => switchTab('business')}
    >
      Business Context
    </button>
    <button 
      class="monaco-tooltip-tab {activeTab === 'code' ? 'active' : ''}"
      on:click={() => switchTab('code')}
    >
      Code
    </button>
  </div>
  
  <div class="monaco-tooltip-tab-content {activeTab === 'business' ? 'active' : ''}">
    <div class="business-context-container">
      <div class="editor-pane">
        <MonacoEditor
          editorId="business-context-{nodeId}"
          language="markdown"
          bind:value={businessContextValue}
          flexible={true}
        />
      </div>
      <div class="preview-pane">
        <div class="markdown-preview">
          {@html markdownPreview}
        </div>
      </div>
    </div>
  </div>
  
  <div class="monaco-tooltip-tab-content {activeTab === 'code' ? 'active' : ''}">
    <div class="command-editors-container" bind:this={gridContainer}>
      <!-- Top row with Core and Shell commands -->
      <div class="top-editors-row" style="flex: 1;">
        <div class="command-editor-section">
          <span class="command-editor-label">Core Command</span>
          <MonacoEditor
            editorId="core-command-{nodeId}"
            language="typescript"
            bind:value={coreCommandValue}
            flexible={true}
          />
        </div>
        <div class="command-editor-section">
          <span class="command-editor-label">Shell Command</span>
          <MonacoEditor
            editorId="shell-command-{nodeId}"
            language="typescript"
            bind:value={shellCommandValue}
            flexible={true}
          />
        </div>
      </div>
      
      <!-- Hydration function row -->
      <div class="hydration-section" style="flex: 0 0 {hydrationHeight}px;">
        <span class="command-editor-label">Hydration Function</span>
        <div class="hydration-editor-container">
          <div class="hydration-resize-handle {isResizing ? 'resizing' : ''}" bind:this={resizeHandle}></div>
          <MonacoEditor
            editorId="hydration-{nodeId}"
            language="typescript"
            bind:value={hydrationValue}
            flexible={true}
          />
        </div>
      </div>
    </div>
  </div>
  
  <div slot="footer">
    <button on:click={handleSave}>Save</button>
    <span class="monaco-tooltip-saved {savedIndicator ? 'show' : ''}">✓ Saved</span>
  </div>
</BaseTooltip>

<style>
  .monaco-tooltip-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    border-bottom: 1px solid #444;
    padding-bottom: 10px;
    flex-shrink: 0;
  }
  
  .monaco-tooltip-tab {
    background: none;
    border: none;
    color: #999;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 14px;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .monaco-tooltip-tab:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }
  
  .monaco-tooltip-tab.active {
    color: #fff;
    background: #0e639c;
  }
  
  .monaco-tooltip-tab-content {
    flex: 1;
    display: none;
  }
  
  .monaco-tooltip-tab-content.active {
    display: flex;
    flex-direction: column;
  }
  
  .business-context-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    flex: 1;
    min-height: 100px;
  }
  
  .editor-pane, .preview-pane {
    overflow: hidden;
  }
  
  .markdown-preview {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 15px;
    border-radius: 4px;
    overflow-y: auto;
    height: 100%;
    border: 1px solid #444;
  }
  
  .markdown-preview :global(h1),
  .markdown-preview :global(h2),
  .markdown-preview :global(h3) {
    color: #fff;
    margin-top: 0;
  }
  
  .markdown-preview :global(ul),
  .markdown-preview :global(ol) {
    padding-left: 20px;
  }
  
  .markdown-preview :global(code) {
    background: #2a2a2a;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  }
  
  .markdown-preview :global(pre) {
    background: #2a2a2a;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
  }
  
  .markdown-preview :global(pre code) {
    background: none;
    padding: 0;
  }
  
  .command-editors-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 100px;
    gap: 15px;
  }
  
  .top-editors-row {
    display: flex;
    gap: 15px;
    min-height: 100px;
    overflow: hidden;
  }
  
  .command-editor-section {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  
  .hydration-section {
    display: flex;
    flex-direction: column;
  }
  
  .hydration-editor-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .hydration-resize-handle {
    height: 6px;
    background: #444;
    cursor: ns-resize;
    border-radius: 3px;
    margin-bottom: 5px;
    position: relative;
    transition: background 0.2s;
  }
  
  .hydration-resize-handle:hover {
    background: #666;
  }
  
  .hydration-resize-handle.resizing {
    background: #777;
  }
  
  .hydration-resize-handle::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 20px;
    height: 2px;
    background: #888;
    border-radius: 1px;
  }
  
  .command-editor-label {
    color: #999;
    font-size: 12px;
    margin-bottom: 5px;
    text-transform: uppercase;
  }
  
  button {
    padding: 8px 16px;
    background: #0e639c;
    border: none;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
  }
  
  button:hover {
    background: #1177bb;
  }
  
  .monaco-tooltip-saved {
    color: #4ec9b0;
    font-size: 14px;
    display: none;
  }
  
  .monaco-tooltip-saved.show {
    display: inline;
  }
</style>