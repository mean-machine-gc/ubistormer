<script>
  import { filters } from '../../stores/index.ts';
  
  const nodeTypes = [
    { id: 'actor', label: 'Actors' },
    { id: 'command', label: 'Commands' },
    { id: 'aggregate', label: 'Aggregates' },
    { id: 'event', label: 'Events' },
    { id: 'viewmodel', label: 'View Models' },
    { id: 'preconditions', label: 'Preconditions' },
    { id: 'guards', label: 'Guards' },
    { id: 'branchinglogic', label: 'Branching Logic' },
    { id: 'boundary', label: 'Pivotal Events' }
  ];
  
  function toggleNodeType(type) {
    filters.update(f => {
      const newTypes = new Set(f.visibleNodeTypes);
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      return { ...f, visibleNodeTypes: newTypes };
    });
  }
  
  function toggleAllNodeTypes() {
    const allTypes = nodeTypes.map(nt => nt.id);
    const currentVisible = $filters.visibleNodeTypes;
    const allVisible = allTypes.every(type => currentVisible.has(type));
    
    if (allVisible) {
      filters.update(f => ({ ...f, visibleNodeTypes: new Set() }));
    } else {
      filters.update(f => ({ ...f, visibleNodeTypes: new Set(allTypes) }));
    }
  }
</script>

<div class="filters">
  <!-- Node Type Filters -->
  <div class="filter-section">
    <div class="filter-header">
      <h3>Node Types</h3>
      <button class="toggle-all" on:click={toggleAllNodeTypes}>
        {nodeTypes.every(nt => $filters.visibleNodeTypes.has(nt.id)) ? 'Hide All' : 'Show All'}
      </button>
    </div>
    <div class="filter-group">
      {#each nodeTypes as nodeType}
        <label class="filter-item">
          <input 
            type="checkbox" 
            checked={$filters.visibleNodeTypes.has(nodeType.id)}
            on:change={() => toggleNodeType(nodeType.id)}
          />
          <span>{nodeType.label}</span>
        </label>
      {/each}
    </div>
  </div>
</div>

<style>
  .filters {
    background: #1a202c;
    border: 1px solid #2d3748;
    border-radius: 8px;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-height: 400px;
    overflow-y: auto;
  }
  
  .filter-section {
    margin-bottom: 20px;
  }
  
  .filter-section:last-child {
    margin-bottom: 0;
  }
  
  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .filter-section h3 {
    color: #e2e8f0;
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }
  
  .toggle-all {
    background: #4a5568;
    color: #e2e8f0;
    border: none;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 10px;
    cursor: pointer;
  }
  
  .toggle-all:hover {
    background: #718096;
  }
  
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .filter-item {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 12px;
    color: #e2e8f0;
  }
  
  .filter-item:hover {
    color: #cbd5e0;
  }
  
  .filter-item input[type="checkbox"] {
    width: 14px;
    height: 14px;
    accent-color: #3182ce;
    cursor: pointer;
  }
  
  .filter-item span {
    user-select: none;
  }
  
  .filters::-webkit-scrollbar {
    width: 6px;
  }
  
  .filters::-webkit-scrollbar-track {
    background: #2d3748;
    border-radius: 3px;
  }
  
  .filters::-webkit-scrollbar-thumb {
    background: #4a5568;
    border-radius: 3px;
  }
  
  .filters::-webkit-scrollbar-thumb:hover {
    background: #718096;
  }
</style>