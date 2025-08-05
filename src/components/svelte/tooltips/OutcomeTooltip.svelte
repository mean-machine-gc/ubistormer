<script>
  import { createEventDispatcher } from 'svelte';
  import BaseTooltip from './BaseTooltip.svelte';
  import MonacoEditor from './MonacoEditor.svelte';
  
  export let nodeId = '';
  export let nodeLabel = '';
  export let visible = false;
  export let position = { x: 100, y: 100 };
  export let outcomeAssertions = '';
  export let exampleState = '';
  
  const dispatch = createEventDispatcher();
  
  let savedIndicator = false;
  $: outcomeValue = outcomeAssertions || getDefaultOutcome();
  $: exampleStateValue = exampleState || getDefaultExampleState();
  
  function getDefaultOutcome() {
    return `# Outcome Assertions for ${nodeLabel}

## Event Structure
event:
  type: "${nodeId}"
  data:
    # Define event payload properties here

## Assertions
assertions:
  - property: "type"
    equals: "${nodeId}"
  
  # Add more assertions for event data validation
`;
  }
  
  function getDefaultExampleState() {
    return `// Example aggregate state after ${nodeLabel} event
const exampleState = {
  // Define example state here
};

export { exampleState };`;
  }
  
  async function handleSave() {
    const changes = {
      nodeId,
      outcomeAssertions: outcomeValue,
      exampleState: exampleStateValue
    };
    
    // Try to save via API
    try {
      const response = await fetch('/api/tooltip-save/save-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          updatedFields: {
            outcomeAssertions: outcomeValue,
            exampleState: exampleStateValue
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
  id="outcome-tooltip-{nodeId}"
  title="Event: {nodeLabel}"
  bind:visible
  {position}
  width="600px"
  minHeight="550px"
  on:close={handleClose}
>
  <div class="outcome-content">
    <div class="outcome-section">
      <h4>Outcome Assertions (YAML)</h4>
      <MonacoEditor
        editorId="outcome-assertions-{nodeId}"
        language="yaml"
        bind:value={outcomeValue}
        flexible={true}
      />
    </div>
    
    <div class="outcome-section">
      <h4>Example State (TypeScript)</h4>
      <MonacoEditor
        editorId="example-state-{nodeId}"
        language="typescript"
        bind:value={exampleStateValue}
        flexible={true}
      />
    </div>
  </div>
  
  <div slot="footer">
    <button on:click={handleSave}>Save</button>
    <span class="monaco-tooltip-saved {savedIndicator ? 'show' : ''}">✓ Saved</span>
  </div>
</BaseTooltip>

<style>
  .outcome-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .outcome-section {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 50px;
  }
  
  .outcome-section h4 {
    color: #999;
    font-size: 12px;
    margin: 0 0 5px 0;
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