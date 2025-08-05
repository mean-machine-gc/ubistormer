<script>
  import { currentPath } from './stores/settings.ts';
  import { graphData, filteredNodes, filteredEdges, appState, graphOperations, graphValidation } from './stores/index.ts';
  
  // Initialize EventStorming API bridge for MCP server
  import './api/eventstorming-client.ts';
  
  // Components
  import SettingsPanel from './components/svelte/SettingsPanel.svelte';
  import AIChat from './components/svelte/AIChat.svelte';
  import GraphControls from './components/svelte/GraphControls.svelte';
  import GraphFilters from './components/svelte/GraphFilters.svelte';
  import TooltipManager from './components/svelte/tooltips/TooltipManager.svelte';
  import EventStormingGraphJointJS from './components/svelte/jointjs/EventStormingGraphSimple.svelte';
  import EventStormingGraphSvelvet from './components/svelte/svelvet/EventStormingGraphSvelvet.svelte';
  
  let graphComponent;
  let renderer = 'jointjs'; // Toggle between 'jointjs' and 'svelvet'
  
  // === REACTIVE DATA LOADING ===
  // Load graph when path changes - pure declarative
  $: if ($currentPath) {
    loadGraph($currentPath);
  }
  
  async function loadGraph(path) {
    try {
      appState.update(state => ({ ...state, isLoading: true }));
      
      const response = await fetch('/api/tooltip-save/get-data', {
        headers: { 'x-json-path': path }
      });
      
      if (response.ok) {
        const result = await response.json();
        // Safely load graph data with fallback for empty/malformed data
        const graphData = result.data || { nodes: [], edges: [] };
        graphOperations.loadGraph(graphData);
        appState.update(state => ({ ...state, isInitialized: true }));
        console.log('✅ Graph loaded from:', path);
      } else {
        console.error('❌ Failed to load graph from:', path);
        graphOperations.loadGraph({ nodes: [], edges: [] });
        appState.update(state => ({ ...state, isInitialized: true }));
      }
      
    } catch (error) {
      console.error('❌ Error loading graph:', error);
      graphOperations.loadGraph({ nodes: [], edges: [] });
      appState.update(state => ({ ...state, isInitialized: true }));
    } finally {
      appState.update(state => ({ ...state, isLoading: false }));
    }
  }
  
  // === EVENT HANDLERS - WITH VALIDATION ===
  function handleNodeAdd(event) {
    const { type, label, position, dimensions, targetElement, connectionType } = event.detail;
    
    // Create the node with validation
    const result = graphOperations.addNode({
      type,
      label,
      position,
      ...(dimensions && { dimensions, subtype: 'pivotal' })
    });
    
    if (!result.success) {
      console.error('❌ Failed to add node:', result.result.errors);
      // TODO: Show user-friendly error message
      return;
    }
    
    console.log('✅ Node added successfully:', result.node.label);
    
    // Create automatic edge if needed (smart connections)
    if (targetElement && connectionType && result.node) {
      const edgeResult = graphOperations.addEdge({
        source: targetElement.id,  // FROM command/event TO business rule
        target: result.node.id,
        label: connectionType
      });
      
      if (!edgeResult.success) {
        console.error('❌ Failed to add edge:', edgeResult.result.errors);
        // TODO: Show user-friendly error message
      } else {
        console.log('✅ Edge added successfully:', connectionType);
      }
    }
  }
  
  function handleNodeDelete(event) {
    const result = graphOperations.deleteNode(event.detail.nodeId);
    
    if (!result.success) {
      console.error('❌ Failed to delete node:', result.result.errors);
      // TODO: Show user-friendly error message
    } else {
      console.log('✅ Node deleted successfully');
      if (result.impact && result.impact.totalReach > 0) {
        console.log('📊 Impact analysis:', result.impact);
        // TODO: Show impact analysis to user
      }
    }
  }
  
  function handleNodePositionUpdate(event) {
    const { nodeId, position, size } = event.detail;
    const updates = { position };
    
    // Handle boundary resizing
    if (size) {
      updates.dimensions = size;
    }
    
    const result = graphOperations.updateNode(nodeId, updates);
    
    if (!result.success) {
      console.error('❌ Failed to update node position:', result.result.errors);
      // TODO: Show user-friendly error message
    }
  }
  
  function handleNodeLabelUpdate(event) {
    const { nodeId, label } = event.detail;
    const result = graphOperations.updateNode(nodeId, { label });
    
    if (!result.success) {
      console.error('❌ Failed to update node label:', result.result.errors);
      // TODO: Show user-friendly error message
    } else {
      console.log('✅ Node label updated successfully');
    }
  }
  
  // === UI CONTROL HANDLERS ===
  function handleResetCamera() {
    graphComponent?.resetView();
  }
  
  function handleToggleLayout() {
    console.log('Layout toggle - TODO: Implement');
  }
  
  function handleExportLifecycle() {
    console.log('Export lifecycle - TODO: Implement');
  }
  
  function handleExportBusinessContext() {
    console.log('Export business context - TODO: Implement');
  }
  
  function handleLayoutChange(layoutName) {
    console.log('Layout changed to:', layoutName);
  }
  
  // === SVELVET-SPECIFIC HANDLERS ===
  function handleNodeClick(node) {
    console.log('Node clicked:', node);
    // Show appropriate tooltip based on node type
    if (window.tooltipManager) {
      const position = { x: node.position.x + 160, y: node.position.y };
      
      switch (node.type) {
        case 'command':
          window.tooltipManager.showCommandTooltip(position, node.id, node.label);
          break;
        case 'aggregate':
          window.tooltipManager.showDomainModelTooltip(position, node.id, node.label);
          break;
        case 'event':
          window.tooltipManager.showOutcomeTooltip(position, node.id, node.label);
          break;
        case 'guards':
        case 'preconditions':
        case 'branchinglogic':
          window.tooltipManager.showAssertionTooltip(position, node.id, node.label);
          break;
      }
    }
  }
  
  function handleNodeDoubleClick(node) {
    console.log('Node double-clicked:', node);
    // Same as click for now, but could add different behavior
    handleNodeClick(node);
  }
</script>

<main>
  <!-- Loading State -->
  {#if $appState.isLoading}
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading graph...</div>
    </div>
  {/if}
  
  <!-- Validation Status -->
  {#if $graphValidation && !$graphValidation.isValid}
    <div class="validation-status error">
      <span class="validation-icon">⚠️</span>
      <span>Graph has {$graphValidation.errors.length} validation errors</span>
    </div>
  {:else if $graphValidation && $graphValidation.warnings.length > 0}
    <div class="validation-status warning">
      <span class="validation-icon">💡</span>
      <span>{$graphValidation.warnings.length} suggestions available</span>
    </div>
  {:else if $graphValidation && $graphValidation.isValid}
    <div class="validation-status success">
      <span class="validation-icon">✅</span>
      <span>Graph follows EventStorming methodology</span>
    </div>
  {/if}
  
  <!-- Renderer Toggle -->
  <div class="renderer-toggle">
    <label>
      <input type="radio" bind:group={renderer} value="jointjs" />
      JointJS
    </label>
    <label>
      <input type="radio" bind:group={renderer} value="svelvet" />
      Svelvet
    </label>
  </div>
  
  <!-- Main Graph - DUMB COMPONENT: Props in, Events out -->
  {#if renderer === 'jointjs'}
    <EventStormingGraphJointJS
      class="main-graph"
      bind:this={graphComponent}
      nodes={$filteredNodes}
      edges={$filteredEdges}
      on:nodeAdd={handleNodeAdd}
      on:nodeDelete={handleNodeDelete}
      on:nodePositionUpdate={handleNodePositionUpdate}
      on:nodeLabelUpdate={handleNodeLabelUpdate}
    />
  {:else if renderer === 'svelvet'}
    <EventStormingGraphSvelvet
      class="main-graph"
      bind:this={graphComponent}
      nodes={$filteredNodes}
      edges={$filteredEdges}
      onNodeClick={handleNodeClick}
      onNodeDoubleClick={handleNodeDoubleClick}
      onNodePositionChange={handleNodePositionUpdate}
    />
  {/if}
  
  <!-- Sidebar Controls -->
  <div class="sidebar">
    <GraphControls 
      onResetCamera={handleResetCamera}
      onToggleLayout={handleToggleLayout}
      onExportLifecycle={handleExportLifecycle}
      onExportBusinessContext={handleExportBusinessContext}
      onLayoutChange={handleLayoutChange}
    />
    
    <GraphFilters />
  </div>
  
  <!-- Settings Panel -->
  <SettingsPanel />
  
  <!-- AI Chat -->
  <AIChat />
  
  <!-- Tooltip Manager - Kept for future use -->
  <TooltipManager narrativeData={$graphData} />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f1419;
    color: #e2e8f0;
  }
  
  main {
    display: flex;
    height: 100vh;
    position: relative;
  }
  
  :global(.main-graph) {
    flex: 1;
  }
  
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 20, 25, 0.9);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #2d3748;
    border-top: 4px solid #3182ce;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
  
  .loading-text {
    color: #a0aec0;
    font-size: 14px;
  }
  
  .validation-status {
    position: fixed;
    top: 16px;
    right: 16px;
    padding: 8px 16px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  .validation-status.success {
    background: #22c55e;
    color: white;
  }
  
  .validation-status.warning {
    background: #f59e0b;
    color: white;
  }
  
  .validation-status.error {
    background: #ef4444;
    color: white;
  }
  
  .validation-icon {
    font-size: 16px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .renderer-toggle {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(30, 30, 30, 0.9);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 8px 16px;
    display: flex;
    gap: 20px;
    z-index: 1000;
  }
  
  .renderer-toggle label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #e2e8f0;
    cursor: pointer;
    font-size: 14px;
  }
  
  .renderer-toggle input[type="radio"] {
    cursor: pointer;
  }
  
  .sidebar {
    width: 300px;
    background: #0f1419;
    border-left: 1px solid #2d3748;
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .sidebar::-webkit-scrollbar {
    width: 6px;
  }
  
  .sidebar::-webkit-scrollbar-track {
    background: #2d3748;
    border-radius: 3px;
  }
  
  .sidebar::-webkit-scrollbar-thumb {
    background: #4a5568;
    border-radius: 3px;
  }
  
  .sidebar::-webkit-scrollbar-thumb:hover {
    background: #718096;
  }
</style>