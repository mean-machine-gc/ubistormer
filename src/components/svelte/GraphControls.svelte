<script>
  import { graphStats, graphHealth, currentLayout } from '../../stores/index.ts';
  import SaveButton from './SaveButton.svelte';
  
  export let onResetCamera;
  export let onToggleLayout;
  export let onExportLifecycle;
  export let onExportBusinessContext;
  export let onLayoutChange;
  
  const layouts = [
    { name: 'timeline', label: 'Timeline' },
    { name: 'grid', label: 'Grid' },
    { name: 'circle', label: 'Circle' },
    { name: 'breadthfirst', label: 'Hierarchy' }
  ];
  
  function handleLayoutClick(layoutName) {
    currentLayout.set(layoutName);
    onLayoutChange(layoutName);
  }
</script>

<div class="controls">
  <div class="controls-section">
    <h3>File Operations</h3>
    <div class="button-group">
      <SaveButton />
    </div>
  </div>
  
  <div class="controls-section">
    <h3>Graph Controls</h3>
    <div class="button-group">
      <button class="control-btn" on:click={onResetCamera}>
        Reset Camera
      </button>
      <button class="control-btn" on:click={onToggleLayout}>
        Apply Layout
      </button>
    </div>
  </div>
  
  <div class="controls-section">
    <h3>Export</h3>
    <div class="button-group">
      <button class="control-btn" on:click={onExportLifecycle}>
        Export Lifecycle
      </button>
      <button class="control-btn" on:click={onExportBusinessContext}>
        Export Business Context
      </button>
    </div>
  </div>
  
  <div class="controls-section">
    <h3>Layouts</h3>
    <div class="layout-buttons">
      {#each layouts as layout}
        <button 
          class="layout-btn"
          class:active={$currentLayout === layout.name}
          on:click={() => handleLayoutClick(layout.name)}
        >
          {layout.label}
        </button>
      {/each}
    </div>
  </div>
  
  <div class="controls-section">
    <h3>Statistics</h3>
    <div class="stats">
      <div class="stat">
        <span class="stat-label">Nodes:</span>
        <span class="stat-value">{$graphStats.totalNodes}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Edges:</span>
        <span class="stat-value">{$graphStats.totalEdges}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Commands:</span>
        <span class="stat-value">{$graphStats.commands}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Events:</span>
        <span class="stat-value">{$graphStats.events}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Aggregates:</span>
        <span class="stat-value">{$graphStats.aggregates}</span>
      </div>
    </div>
  </div>
  
  <div class="controls-section">
    <h3>Graph Health</h3>
    <div class="stats">
      <div class="stat">
        <span class="stat-label">Validation Score:</span>
        <span class="stat-value">{$graphHealth.methodology.validationScore}%</span>
      </div>
      <div class="stat">
        <span class="stat-label">Density:</span>
        <span class="stat-value">{($graphHealth.overall.density * 100).toFixed(1)}%</span>
      </div>
      <div class="stat">
        <span class="stat-label">Components:</span>
        <span class="stat-value">{$graphHealth.overall.connectedComponents}</span>
      </div>
      {#if $graphHealth.complexity.cyclicComplexity > 0}
        <div class="stat warning">
          <span class="stat-label">⚠️ Cycles:</span>
          <span class="stat-value">{$graphHealth.complexity.cyclicComplexity}</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .controls {
    background: #1a202c;
    border: 1px solid #2d3748;
    border-radius: 8px;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .controls-section {
    margin-bottom: 20px;
  }
  
  .controls-section:last-child {
    margin-bottom: 0;
  }
  
  .controls-section h3 {
    color: #e2e8f0;
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }
  
  .button-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .control-btn {
    background: #2d3748;
    color: #e2e8f0;
    border: 1px solid #4a5568;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }
  
  .control-btn:hover {
    background: #4a5568;
  }
  
  .layout-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .layout-btn {
    background: #2d3748;
    color: #e2e8f0;
    border: 1px solid #4a5568;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s;
  }
  
  .layout-btn:hover {
    background: #4a5568;
  }
  
  .layout-btn.active {
    background: #3182ce;
    border-color: #3182ce;
  }
  
  .stats {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }
  
  .stat-label {
    color: #a0aec0;
  }
  
  .stat-value {
    color: #e2e8f0;
    font-weight: 500;
  }
  
  .stat.warning .stat-label {
    color: #f59e0b;
  }
  
  .stat.warning .stat-value {
    color: #f59e0b;
    font-weight: 600;
  }
</style>