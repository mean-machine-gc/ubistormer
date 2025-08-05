<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let isOpen = true;
  export let paper = null; // JointJS paper instance
  
  
  // EventStorming node types with their configurations
  const nodeTypes = [
    {
      type: 'actor',
      label: 'Actor',
      color: '#fff2cc',
      description: 'People or systems that initiate actions',
      icon: '👤'
    },
    {
      type: 'command',
      label: 'Command',
      color: '#3498db',
      description: 'Actions or intentions',
      icon: '⚡'
    },
    {
      type: 'aggregate',
      label: 'Aggregate',
      color: '#f1c40f',
      description: 'Business objects or entities',
      icon: '📦'
    },
    {
      type: 'event',
      label: 'Event',
      color: '#ff9500',
      description: 'Things that happened',
      icon: '🔔'
    },
    {
      type: 'viewmodel',
      label: 'View Model',
      color: '#2ecc71',
      description: 'Read models or projections',
      icon: '📊'
    },
    {
      type: 'preconditions',
      label: 'Precondition',
      color: '#ffcccc',
      description: 'Requirements for execution',
      icon: '✓'
    },
    {
      type: 'guards',
      label: 'Guard',
      color: '#ff6666',
      description: 'Validation rules',
      icon: '🛡️'
    },
    {
      type: 'branchinglogic',
      label: 'Branching Condition',
      color: '#ff9999',
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
  let dragElement = null;
  let flyingPaper = null;
  let dragOffset = { x: 0, y: 0 };
  let currentDragNodeType = null;
  
  function handleDragStart(event, nodeType) {
    if (!paper) return;
    
    event.preventDefault();
    isDragging = true;
    currentDragNodeType = nodeType; // Store the node type
    
    
    // Calculate drag offset
    const rect = event.currentTarget.getBoundingClientRect();
    dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Create flying element for visual feedback
    createFlyingElement(nodeType, event);
    
    // Add global event listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }
  
  function createFlyingElement(nodeType, event) {
    // Create container for flying element
    const flyContainer = document.createElement('div');
    flyContainer.id = 'flying-element';
    flyContainer.style.cssText = `
      position: fixed;
      z-index: 10000;
      pointer-events: none;
      opacity: 0.7;
      transform: scale(0.8);
      transition: none;
    `;
    
    // Create a mini version of the node
    const miniNode = document.createElement('div');
    miniNode.style.cssText = `
      width: 60px;
      height: 30px;
      background: ${nodeType.color};
      border: 2px solid #333;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      color: #000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;
    miniNode.textContent = nodeType.label;
    
    flyContainer.appendChild(miniNode);
    document.body.appendChild(flyContainer);
    
    // Position it at mouse
    flyContainer.style.left = (event.clientX - dragOffset.x) + 'px';
    flyContainer.style.top = (event.clientY - dragOffset.y) + 'px';
    
    dragElement = flyContainer;
  }
  
  function handleDragMove(event) {
    if (!isDragging || !dragElement) return;
    
    // Update flying element position
    dragElement.style.left = (event.clientX - dragOffset.x) + 'px';
    dragElement.style.top = (event.clientY - dragOffset.y) + 'px';
    
    // Highlight valid drop targets
    highlightValidTargets(event);
  }
  
  function highlightValidTargets(event) {
    if (!paper || !currentDragNodeType) return;
    
    const paperRect = paper.el.getBoundingClientRect();
    const paperPos = {
      x: event.clientX - paperRect.left,
      y: event.clientY - paperRect.top
    };
    
    // Convert to paper coordinates
    const paperTransform = paper.matrix();
    const localPos = {
      x: (paperPos.x - paperTransform.e) / paperTransform.a,
      y: (paperPos.y - paperTransform.f) / paperTransform.d
    };
    
    // Get all elements and reset their styling
    const elements = paper.model.getElements();
    elements.forEach(element => {
      element.attr('body/stroke', '#333');
      element.attr('body/strokeWidth', 2);
    });
    
    // Define valid targets for each node type
    const validTargets = {
      preconditions: ['command'],
      guards: ['command'],
      branchinglogic: ['event'],
      event: ['command'],
      boundary: ['event'] // Boundaries can be dropped on events
    };
    
    const allowedTypes = validTargets[currentDragNodeType.type];
    
    // If this node type requires a connection, highlight targets
    if (allowedTypes) {
      // Check if we're over any element
      let isOverAnyElement = false;
      
      elements.forEach(element => {
        const nodeType = element.get('nodeType');
        const bbox = element.getBBox();
        const isHovered = localPos.x >= bbox.x && 
                         localPos.x <= bbox.x + bbox.width &&
                         localPos.y >= bbox.y && 
                         localPos.y <= bbox.y + bbox.height;
        
        if (isHovered) {
          isOverAnyElement = true;
        }
        
        if (allowedTypes.includes(nodeType)) {
          // Valid target
          if (isHovered) {
            // Highlight as active valid drop target
            element.attr('body/stroke', '#28a745');
            element.attr('body/strokeWidth', 4);
          } else {
            // Show as valid target
            element.attr('body/stroke', '#17a2b8');
            element.attr('body/strokeWidth', 3);
          }
        } else if (isHovered) {
          // Invalid target when hovered
          element.attr('body/stroke', '#dc3545');
          element.attr('body/strokeWidth', 4);
        }
      });
      
      // If dragging over empty space for a connection-required node, show warning
      if (!isOverAnyElement) {
        updateDragElementVisual('invalid');
      } else {
        updateDragElementVisual('normal');
      }
    } else {
      // For standalone-allowed nodes, no special highlighting needed
      updateDragElementVisual('normal');
    }
  }
  
  function updateDragElementVisual(state) {
    if (!dragElement) return;
    
    const miniNode = dragElement.querySelector('div');
    if (state === 'invalid') {
      miniNode.style.border = '2px solid #dc3545';
      miniNode.style.backgroundColor = '#f8d7da';
    } else {
      miniNode.style.border = '2px solid #333';
      miniNode.style.backgroundColor = currentDragNodeType?.color || '#fff';
    }
  }
  
  function handleDragEnd(event) {
    if (!isDragging) return;
    
    isDragging = false;
    
    // Check if dropped on paper
    if (paper && isOverPaper(event)) {
      const paperRect = paper.el.getBoundingClientRect();
      const paperPos = {
        x: event.clientX - paperRect.left,
        y: event.clientY - paperRect.top
      };
      
      // Convert screen coordinates to paper coordinates considering current zoom/pan
      const paperTransform = paper.matrix();
      const localPos = {
        x: (paperPos.x - paperTransform.e) / paperTransform.a,
        y: (paperPos.y - paperTransform.f) / paperTransform.d
      };
      
      // Check if dropped on an existing element for smart connections
      const targetElement = getElementAtPosition(localPos);
      
      if (currentDragNodeType) {
        // Apply creation rules for connection-dependent nodes
        const canCreate = validateNodeCreation(currentDragNodeType, targetElement);
        
        if (canCreate.allowed) {
          dispatch('nodeAdd', {
            nodeType: currentDragNodeType,
            position: localPos,
            targetElement: targetElement,
            connectionType: canCreate.connectionType
          });
        } else {
          console.log('❌ Cannot create', currentDragNodeType.type, ':', canCreate.reason);
          // Could show a user-friendly error message here
        }
      }
    }
    
    // Cleanup
    cleanup();
  }
  
  function validateNodeCreation(nodeType, targetElement) {
    const type = nodeType.type;
    
    // Connection-dependent nodes that require specific targets
    if (type === 'preconditions' || type === 'guards') {
      if (!targetElement || targetElement.type !== 'command') {
        return {
          allowed: false,
          reason: `${nodeType.label} must be dropped on a Command`
        };
      }
      return {
        allowed: true,
        connectionType: type === 'preconditions' ? 'if preconditions' : 'if guard'
      };
    }
    
    if (type === 'branchinglogic') {
      if (!targetElement || targetElement.type !== 'event') {
        return {
          allowed: false,
          reason: 'Branching Logic must be dropped on an Event'
        };
      }
      return {
        allowed: true,
        connectionType: 'if'
      };
    }
    
    // Events: can be created anywhere or on commands
    if (type === 'event') {
      if (targetElement && targetElement.type === 'command') {
        return {
          allowed: true,
          connectionType: 'then'
        };
      }
      // Can also be created on empty canvas
      return {
        allowed: true,
        connectionType: null
      };
    }
    
    // Commands: can be created anywhere, on aggregates, or on events
    if (type === 'command') {
      if (targetElement && targetElement.type === 'aggregate') {
        return {
          allowed: true,
          connectionType: 'on'
        };
      }
      if (targetElement && targetElement.type === 'event') {
        return {
          allowed: true,
          connectionType: 'then (policy)'
        };
      }
      // Can also be created on empty canvas
      return {
        allowed: true,
        connectionType: null
      };
    }
    
    // All other node types can be created anywhere
    return {
      allowed: true,
      connectionType: null
    };
  }
  
  function getElementAtPosition(position) {
    if (!paper) return null;
    
    // Get all elements from the graph
    const elements = paper.model.getElements();
    
    // Find element that contains this position
    for (const element of elements) {
      const bbox = element.getBBox();
      if (position.x >= bbox.x && 
          position.x <= bbox.x + bbox.width &&
          position.y >= bbox.y && 
          position.y <= bbox.y + bbox.height) {
        return {
          id: element.id,
          type: element.get('nodeType'),
          label: element.attr('label/text')
        };
      }
    }
    
    return null;
  }
  
  function isOverPaper(event) {
    if (!paper) return false;
    
    const paperRect = paper.el.getBoundingClientRect();
    return (
      event.clientX >= paperRect.left &&
      event.clientX <= paperRect.right &&
      event.clientY >= paperRect.top &&
      event.clientY <= paperRect.bottom
    );
  }
  
  function getCurrentDragNodeType(event) {
    // Find the original element that started the drag
    const target = document.elementFromPoint(
      event.clientX - dragOffset.x + 60, // Center of dragged element
      event.clientY - dragOffset.y + 30
    );
    
    if (target) {
      const nodeElement = target.closest('[data-node-type]');
      if (nodeElement) {
        const nodeTypeStr = nodeElement.dataset.nodeType;
        return nodeTypes.find(nt => nt.type === nodeTypeStr);
      }
    }
    
    return null;
  }
  
  function cleanup() {
    if (dragElement) {
      dragElement.remove();
      dragElement = null;
    }
    
    // Reset all element highlighting
    if (paper) {
      const elements = paper.model.getElements();
      elements.forEach(element => {
        element.attr('body/stroke', '#333');
        element.attr('body/strokeWidth', 2);
      });
    }
    
    currentDragNodeType = null;
    
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }
  
  function toggleDrawer() {
    isOpen = !isOpen;
  }
  
  function handleAddNode(nodeType) {
    // Generate a unique ID for the new node
    const nodeId = `${nodeType.type}-${Date.now()}`;
    
    // Dispatch event to add node to canvas at center
    dispatch('nodeAdd', {
      nodeType,
      position: { x: 200, y: 200 } // Default center position
    });
  }
</script>

<div class="drawer-container" class:open={isOpen}>
  <!-- Drawer Toggle Button -->
  <button class="drawer-toggle" on:click={toggleDrawer}>
    {#if isOpen}
      <span class="toggle-icon">◀</span>
    {:else}
      <span class="toggle-icon">▶</span>
    {/if}
    <span class="toggle-text">Palette</span>
  </button>
  
  <!-- Drawer Content -->
  {#if isOpen}
    <div class="drawer-content">
      <div class="drawer-header">
        <h3>EventStorming Palette</h3>
        <p>Drag nodes onto the canvas or click to add</p>
      </div>
      
      <div class="node-palette">
        {#each nodeTypes as nodeType (nodeType.type)}
          <div 
            class="palette-node"
            style="background-color: {nodeType.color};"
            data-node-type={nodeType.type}
            on:mousedown={(e) => handleDragStart(e, nodeType)}
            on:click={() => handleAddNode(nodeType)}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && handleAddNode(nodeType)}
          >
            <div class="node-icon">{nodeType.icon}</div>
            <div class="node-info">
              <div class="node-label">{nodeType.label}</div>
              <div class="node-description">{nodeType.description}</div>
            </div>
          </div>
        {/each}
      </div>
      
      <div class="drawer-footer">
        <p class="help-text">
          💡 Drag nodes to canvas or click to add at center
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .drawer-container {
    position: fixed;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1000;
    display: flex;
    align-items: center;
    transition: all 0.3s ease;
  }
  
  .drawer-container.open {
    left: 0;
  }
  
  .drawer-toggle {
    background: #2d3748;
    color: white;
    border: none;
    padding: 12px 8px;
    cursor: pointer;
    border-radius: 0 8px 8px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    transition: background-color 0.2s;
    min-width: 50px;
  }
  
  .drawer-toggle:hover {
    background: #4a5568;
  }
  
  .toggle-icon {
    font-size: 12px;
    font-weight: bold;
  }
  
  .toggle-text {
    font-size: 10px;
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }
  
  .drawer-content {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0 8px 8px 0;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
    width: 280px;
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  
  .drawer-header {
    padding: 16px;
    border-bottom: 1px solid #e2e8f0;
    background: #f7fafc;
  }
  
  .drawer-header h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: #2d3748;
  }
  
  .drawer-header p {
    margin: 0;
    font-size: 12px;
    color: #718096;
  }
  
  .node-palette {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }
  
  .palette-node {
    border: 2px solid #333;
    border-radius: 8px;
    padding: 12px;
    cursor: grab;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 12px;
    user-select: none;
  }
  
  .palette-node:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .palette-node:active {
    cursor: grabbing;
    transform: translateY(0);
  }
  
  .node-icon {
    font-size: 20px;
    min-width: 24px;
    text-align: center;
  }
  
  .node-info {
    flex: 1;
  }
  
  .node-label {
    font-weight: 600;
    font-size: 14px;
    color: #000;
    margin-bottom: 2px;
  }
  
  .node-description {
    font-size: 11px;
    color: #333;
    opacity: 0.8;
    line-height: 1.3;
  }
  
  .drawer-footer {
    padding: 12px 16px;
    border-top: 1px solid #e2e8f0;
    background: #f7fafc;
  }
  
  .help-text {
    margin: 0;
    font-size: 11px;
    color: #718096;
    text-align: center;
  }
  
  /* Scrollbar styling */
  .drawer-content::-webkit-scrollbar {
    width: 6px;
  }
  
  .drawer-content::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  
  .drawer-content::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  
  .drawer-content::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }
  
  /* Global flying element styles */
  :global(#flying-element) {
    pointer-events: none !important;
  }
</style>