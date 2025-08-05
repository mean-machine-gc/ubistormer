<script>
  import { createEventDispatcher } from 'svelte';
  import BaseTooltip from './BaseTooltip.svelte';
  import MonacoEditor from './MonacoEditor.svelte';
  
  export let nodeId = '';
  export let nodeLabel = '';
  export let visible = false;
  export let position = { x: 100, y: 100 };
  export let assertion = '';
  
  const dispatch = createEventDispatcher();
  
  let savedIndicator = false;
  $: assertionValue = assertion || getDefaultAssertion();
  
  function getDefaultAssertion() {
    return `import { DecisionModel, Preconditions } from './ubi-types';
import { YourCommand } from './commands';
import { YourAggregate } from './domain';

// Define preconditions/guards for ${nodeLabel}
export const ${nodeLabel}: Preconditions<
  DecisionModel<YourCommand, YourAggregate>
> = {
  "${nodeId}": (model) => {
    // Implement your assertion logic here
    // Return true if condition is met, false otherwise
    return true;
  }
};`;
  }
  
  async function handleSave() {
    const changes = {
      nodeId,
      assertion: assertionValue
    };
    
    // Try to save via API
    try {
      const response = await fetch('/api/tooltip-save/save-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          updatedFields: {
            assertion: assertionValue
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
</script>

<BaseTooltip
  id="assertion-tooltip-{nodeId}"
  title="Assertion: {nodeLabel}"
  bind:visible
  {position}
  width="600px"
  minHeight="450px"
  on:close={handleClose}
>
  <div class="assertion-monaco-container">
    <MonacoEditor
      editorId="assertion-{nodeId}"
      language="typescript"
      bind:value={assertionValue}
      flexible={true}
    />
  </div>
  
  <div slot="footer">
    <button on:click={handleSave}>Save</button>
    <span class="monaco-tooltip-saved {savedIndicator ? 'show' : ''}">✓ Saved</span>
  </div>
</BaseTooltip>

<style>
  .assertion-monaco-container {
    flex: 1;
    display: flex;
    flex-direction: column;
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