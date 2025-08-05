<script>
  import { createEventDispatcher } from 'svelte';
  import BaseTooltip from './BaseTooltip.svelte';
  import MonacoEditor from './MonacoEditor.svelte';
  import { marked } from 'marked';
  
  export let nodeId = '';
  export let nodeLabel = '';
  export let visible = false;
  export let position = { x: 100, y: 100 };
  export let yaml = '';
  export let businessContext = '';
  export let domainModel = '';
  export let objectExamples = '';
  
  const dispatch = createEventDispatcher();
  
  let activeTab = 'yaml';
  let savedIndicator = false;
  
  // Track editor values - reactive to prop changes
  $: yamlValue = yaml || getDefaultYaml();
  $: businessContextValue = businessContext || getDefaultBusinessContext();
  $: domainModelValue = domainModel || getDefaultDomainModel();
  $: objectExamplesValue = objectExamples || getDefaultObjectExamples();
  
  function getDefaultYaml() {
    return `# ${nodeLabel} Configuration
apiVersion: v1
kind: Aggregate
metadata:
  name: ${nodeLabel.toLowerCase().replace(/\s+/g, '-')}
  labels:
    domain: eventstorming
    type: aggregate
spec:
  # Define aggregate configuration here
  properties:
    # Add your aggregate properties
  events:
    # List events this aggregate can produce
  commands:
    # List commands this aggregate handles
`;
  }
  
  function getDefaultBusinessContext() {
    return `# ${nodeLabel}

## Business Context

Describe the business entity and its role in the domain...

## Key Properties

- What information does this aggregate manage?
- What are the business invariants?
- How does it relate to other aggregates?
`;
  }
  
  function getDefaultDomainModel() {
    return `// Domain model for ${nodeLabel}
export type ${nodeLabel} = {
  id: string;
  // Define aggregate properties here
};`;
  }
  
  function getDefaultObjectExamples() {
    return `// Add examples of the domain object

// Example 1: Basic ${nodeLabel}
const example1: ${nodeLabel} = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  // Add example properties here
};

// Example 2: Complex ${nodeLabel}
const example2: ${nodeLabel} = {
  id: "987f6543-e21c-43d2-b567-789012345678",
  // Add more complex example properties here
};`;
  }
  
  function switchTab(tab) {
    activeTab = tab;
  }
  
  async function handleSave() {
    const changes = {
      nodeId,
      yaml: yamlValue,
      businessContext: businessContextValue,
      domainModel: domainModelValue,
      objectExamples: objectExamplesValue
    };
    
    // Try to save via API
    try {
      const response = await fetch('/api/tooltip-save/save-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          updatedFields: {
            yaml: yamlValue,
            businessContext: businessContextValue,
            domainModel: domainModelValue,
            objectExamples: objectExamplesValue
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
  
  $: markdownPreview = marked(businessContextValue);
</script>

<BaseTooltip
  id="domain-tooltip-{nodeId}"
  title="Aggregate: {nodeLabel}"
  bind:visible
  {position}
  width="700px"
  minHeight="500px"
  on:close={handleClose}
>
  <div class="monaco-tooltip-tabs">
    <button 
      class="monaco-tooltip-tab {activeTab === 'yaml' ? 'active' : ''}"
      on:click={() => switchTab('yaml')}
    >
      YAML
    </button>
    <button 
      class="monaco-tooltip-tab {activeTab === 'examples' ? 'active' : ''}"
      on:click={() => switchTab('examples')}
    >
      Object Examples
    </button>
    <button 
      class="monaco-tooltip-tab {activeTab === 'business' ? 'active' : ''}"
      on:click={() => switchTab('business')}
    >
      Business Context
    </button>
    <button 
      class="monaco-tooltip-tab {activeTab === 'domain' ? 'active' : ''}"
      on:click={() => switchTab('domain')}
    >
      Domain Model
    </button>
  </div>
  
  <div class="monaco-tooltip-tab-content {activeTab === 'yaml' ? 'active' : ''}">
    <MonacoEditor
      editorId="yaml-{nodeId}"
      language="yaml"
      bind:value={yamlValue}
      flexible={true}
    />
  </div>
  
  <div class="monaco-tooltip-tab-content {activeTab === 'examples' ? 'active' : ''}">
    <MonacoEditor
      editorId="object-examples-{nodeId}"
      language="typescript"
      bind:value={objectExamplesValue}
      flexible={true}
    />
  </div>
  
  <div class="monaco-tooltip-tab-content {activeTab === 'business' ? 'active' : ''}">
    <div class="business-context-container">
      <div class="editor-pane">
        <MonacoEditor
          editorId="business-context-domain-{nodeId}"
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
  
  <div class="monaco-tooltip-tab-content {activeTab === 'domain' ? 'active' : ''}">
    <MonacoEditor
      editorId="domain-model-{nodeId}"
      language="typescript"
      bind:value={domainModelValue}
      flexible={true}
    />
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
    min-height: 0; /* Important for flex children */
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
    min-height: 0; /* Allow shrinking */
    height: 100%; /* Fill available height */
  }
  
  .editor-pane, .preview-pane {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0; /* Allow shrinking */
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