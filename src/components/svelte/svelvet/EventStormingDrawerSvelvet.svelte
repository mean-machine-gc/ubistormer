<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let isOpen = true;
  export let nodes = [];
  export let position = { x: 0, y: 0 };
  
  // EventStorming node types with their configurations
  const nodeTypes = [
    {
      type: 'actor',
      label: 'Actor',
      color: '#FFE4B5',
      description: 'People or systems that initiate actions',
      icon: '👤'
    },
    {
      type: 'command',
      label: 'Command',
      color: '#E6F3FF',
      description: 'Actions or intentions',
      icon: '⚡'
    },
    {
      type: 'aggregate',
      label: 'Aggregate',
      color: '#FFFACD',
      description: 'Business objects or entities',
      icon: '📦'
    },
    {
      type: 'event',
      label: 'Event',
      color: '#FFE4E1',
      description: 'Things that happened',
      icon: '🔔'
    },
    {
      type: 'viewmodel',
      label: 'View Model',
      color: '#E6E6FA',
      description: 'Read models or projections',
      icon: '📊'
    },
    {
      type: 'preconditions',
      label: 'Precondition',
      color: '#FFA07A',
      description: 'Requirements for execution',
      icon: '✓'
    },
    {
      type: 'guards',
      label: 'Guard',
      color: '#D8BFD8',
      description: 'Validation rules',
      icon: '🛡️'
    },
    {
      type: 'branchinglogic',
      label: 'Branching Condition',
      color: '#98FB98',
      description: 'Branching logic points',
      icon: '🔀'
    },
    {
      type: 'boundary',
      label: 'Pivotal Event',
      color: '#fff59d',
      description: 'Timeline boundary - everything after this event',
      icon: '│',
      subtype: 'pivotal'
    }
  ];
  
  let isDragging = false;
  let dragGhost = null;
  let currentDragNodeType = null;
  
  // Simple click to add node (only if not dragging)
  function handleNodeClick(nodeType) {
    // Don't trigger click if we're dragging
    if (isDragging) return;
    
    // Create with default label
    const label = `New ${nodeType.label}`;
    
    dispatch('addNode', {
      type: nodeType.type,
      label: label,
      targetElement: null,
      connectionType: null,
      isBoundary: nodeType.type === 'boundary',
      boundarySize: nodeType.type === 'boundary' ? { width: 200, height: 400 } : null
    });
    
    // Close drawer after adding
    isOpen = false;
  }
  
  // Mouse drag implementation to avoid conflicts with Svelvet
  let dragStartPos = { x: 0, y: 0 };
  let ghostElement = null;
  
  function handleMouseDown(event, nodeType) {
    event.preventDefault();
    currentDragNodeType = nodeType;
    isDragging = true;
    
    dragStartPos = { x: event.clientX, y: event.clientY };
    
    // Create ghost element
    ghostElement = document.createElement('div');
    ghostElement.className = 'drag-ghost';
    ghostElement.style.background = nodeType.color;
    ghostElement.style.padding = '8px 16px';
    ghostElement.style.borderRadius = '4px';
    ghostElement.style.border = '2px solid rgba(0,0,0,0.2)';
    ghostElement.style.position = 'fixed';
    ghostElement.style.pointerEvents = 'none';
    ghostElement.style.zIndex = '10000';
    ghostElement.textContent = nodeType.label;
    document.body.appendChild(ghostElement);
    
    // Add mouse listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
  
  function handleMouseMove(event) {
    if (!isDragging || !ghostElement) return;
    
    ghostElement.style.left = event.clientX + 10 + 'px';
    ghostElement.style.top = event.clientY + 10 + 'px';
  }
  
  function handleMouseUp(event) {
    if (!isDragging) return;
    
    // Check if we're over the canvas
    const canvasElement = document.querySelector('.svelvet-container');
    if (canvasElement) {
      const rect = canvasElement.getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom) {
        
        // Calculate position
        const dropPosition = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        };
        
        // Dispatch node creation
        dispatch('addNode', {
          type: currentDragNodeType.type,
          label: `New ${currentDragNodeType.label}`,
          position: dropPosition
        });
      }
    }
    
    // Clean up
    isDragging = false;
    currentDragNodeType = null;
    if (ghostElement) {
      document.body.removeChild(ghostElement);
      ghostElement = null;
    }
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Close drawer
    isOpen = false;
  }
  
  // Handle drop on the canvas (this would be handled by parent)
  function handleDrop(event) {
    event.preventDefault();
    
    if (!currentDragNodeType) return;
    
    const label = prompt(`Enter ${currentDragNodeType.label} name:`, `New ${currentDragNodeType.label}`);
    if (!label) return;
    
    // Calculate drop position relative to canvas
    const rect = event.currentTarget.getBoundingClientRect();
    const dropPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    dispatch('addNode', {
      type: currentDragNodeType.type,
      label: label,
      position: dropPosition,
      targetElement: null,
      connectionType: null,
      isBoundary: currentDragNodeType.type === 'boundary',
      boundarySize: currentDragNodeType.type === 'boundary' ? { width: 200, height: 400 } : null
    });
    
    isOpen = false;
  }
  
  // Smart connections for business rules
  function getSmartConnection(nodeType) {
    const targetableTypes = {
      'guards': { targets: ['command'], connection: 'if guard' },
      'preconditions': { targets: ['command'], connection: 'if preconditions' },
      'branchinglogic': { targets: ['event'], connection: 'if' }
    };
    
    const config = targetableTypes[nodeType];
    if (!config) return null;
    
    // Find potential targets
    const targets = nodes.filter(n => config.targets.includes(n.type));
    if (targets.length === 0) return null;
    
    // Find closest target to click position
    let closestTarget = null;
    let minDistance = Infinity;
    
    targets.forEach(target => {
      const dist = Math.sqrt(
        Math.pow(target.position.x - position.x, 2) + 
        Math.pow(target.position.y - position.y, 2)
      );
      if (dist < minDistance && dist < 200) { // 200px threshold
        minDistance = dist;
        closestTarget = target;
      }
    });
    
    return closestTarget ? { target: closestTarget, connection: config.connection } : null;
  }
  
  // Check for smart connections when adding business rules
  function handleSmartNodeAdd(nodeType) {
    const label = `New ${nodeType.label}`;
    
    let targetElement = null;
    let connectionType = null;
    
    // Check for smart connections
    const smartConnection = getSmartConnection(nodeType.type);
    if (smartConnection) {
      targetElement = smartConnection.target;
      connectionType = smartConnection.connection;
    }
    
    dispatch('addNode', {
      type: nodeType.type,
      label: label,
      targetElement,
      connectionType,
      isBoundary: nodeType.type === 'boundary',
      boundarySize: nodeType.type === 'boundary' ? { width: 200, height: 400 } : null
    });
    
    isOpen = false;
  }
</script>

{#if isOpen}
  <div class="drawer" style="left: {position.x}px; top: {position.y}px;">
    <div class="drawer-header">
      <h3>Add Node</h3>
      <button class="close-btn" on:click={() => isOpen = false}>×</button>
    </div>
    
    <div class="node-types">
      {#each nodeTypes as nodeType}
        <div 
          class="node-type-item"
          style="background-color: {nodeType.color}"
          on:click={() => handleSmartNodeAdd(nodeType)}
          on:mousedown={(e) => handleMouseDown(e, nodeType)}
          title="{nodeType.description}"
        >
          <span class="node-icon">{nodeType.icon}</span>
          <span class="node-label">{nodeType.label}</span>
        </div>
      {/each}
    </div>
    
    <div class="drawer-footer">
      <p class="hint">Click to add a node at this position</p>
      <p class="hint-small">Guards/Preconditions auto-connect to nearby commands</p>
    </div>
  </div>
{/if}

<style>
  .drawer {
    position: fixed;
    background: #1e1e1e;
    border: 1px solid #444;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    z-index: 10000;
    min-width: 220px;
    animation: slideIn 0.2s ease-out;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #444;
  }
  
  .drawer-header h3 {
    margin: 0;
    font-size: 16px;
    color: #fff;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: #999;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  
  .node-types {
    padding: 8px;
    max-height: 400px;
    overflow-y: auto;
  }
  
  .node-type-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin: 4px 0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
    user-select: none;
  }
  
  .node-type-item:hover {
    transform: translateX(4px);
    border-color: rgba(0, 0, 0, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  .node-type-item:active {
    transform: translateX(2px);
  }
  
  .node-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
  }
  
  .node-label {
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }
  
  .drawer-footer {
    padding: 12px 16px;
    border-top: 1px solid #444;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .hint {
    margin: 0;
    font-size: 12px;
    color: #999;
    text-align: center;
  }
  
  .hint-small {
    margin: 4px 0 0 0;
    font-size: 11px;
    color: #666;
    text-align: center;
  }
  
  /* Drag ghost styling */
  :global(.drag-ghost) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #333;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
</style>