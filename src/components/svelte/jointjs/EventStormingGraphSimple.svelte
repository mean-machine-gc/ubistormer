<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { dia, shapes, util } from '@joint/core';
  import EventStormingDrawer from './EventStormingDrawer.svelte';
  
  export let width = '100%';
  export let height = '100%';
  export let nodes = [];
  export let edges = [];
  
  const dispatch = createEventDispatcher();
  
  let graphContainer;
  let graph;
  let paper;
  let isReady = false;
  let scale = 1;
  let paperTranslate = { x: 0, y: 0 };
  
  // Double-click detection variables
  let lastClickTime = 0;
  let lastClickedElement = null;
  const DOUBLE_CLICK_THRESHOLD = 400; // milliseconds
  
  // EventStorming color scheme
  const nodeColors = {
    actor: '#fff2cc',
    command: '#3498db',
    aggregate: '#f1c40f',
    event: '#ff9500',
    viewmodel: '#2ecc71',
    preconditions: '#ffdddd', // Softer pink for tags
    guards: '#ff8888',        // Softer red for tags
    branchinglogic: '#ffaaaa', // Softer red for tags
    boundary: '#fff59d'
  };
  
  // Helper function to measure text width
  function measureTextWidth(text, fontSize = 11, fontFamily = 'Arial, sans-serif') {
    // Create a temporary canvas element for text measurement
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${fontSize}px ${fontFamily}`;
    return context.measureText(text).width;
  }

  // Create JointJS shapes
  function createEventStormingShapes() {
    shapes.eventstorming = {};
    
    Object.keys(nodeColors).forEach(type => {
      if (type === 'boundary') {
        shapes.eventstorming[type] = shapes.standard.Rectangle.define(`eventstorming.${type}`, {
          size: { width: 20, height: 200 },
          attrs: {
            body: { strokeWidth: 0, fill: nodeColors[type], fillOpacity: 0.6, rx: 0, ry: 0 },
            label: { fontSize: 11, fontFamily: 'Arial, sans-serif', fill: '#666', textAnchor: 'middle', textVerticalAnchor: 'top', refY: -20 }
          }
        });
      } else if (type === 'guards' || type === 'preconditions' || type === 'branchinglogic') {
        // Business rule nodes as auto-sizing tags
        shapes.eventstorming[type] = shapes.standard.Rectangle.define(`eventstorming.${type}`, {
          size: { width: 80, height: 24 }, // Default size, will be overridden
          attrs: {
            body: { strokeWidth: 1, stroke: '#333', fill: nodeColors[type], rx: 12, ry: 12 },
            label: { 
              fontSize: 11, 
              fontFamily: 'Arial, sans-serif', 
              fill: '#000', 
              textAnchor: 'middle', 
              textVerticalAnchor: 'middle'
              // No textWrap - let text determine size naturally
            }
          }
        });
      } else {
        // Regular nodes - 20% bigger
        shapes.eventstorming[type] = shapes.standard.Rectangle.define(`eventstorming.${type}`, {
          size: { width: 144, height: 72 }, // 20% bigger: 120*1.2=144, 60*1.2=72
          attrs: {
            body: { strokeWidth: 2, stroke: '#333', fill: nodeColors[type], rx: 8, ry: 8 },
            label: { 
              fontSize: 14, 
              fontFamily: 'Arial, sans-serif', 
              fill: '#000', 
              textAnchor: 'middle', 
              textVerticalAnchor: 'middle',
              textWrap: {
                width: 130, // Slightly less than node width for padding
                height: 58,  // Slightly less than node height for padding
                ellipsis: true
              }
            }
          }
        });
      }
    });
  }
  
  // Initialize JointJS
  onMount(() => {
    createEventStormingShapes();
    
    graph = new dia.Graph();
    paper = new dia.Paper({
      el: graphContainer,
      model: graph,
      width: '100%',
      height: '100%',
      gridSize: 10,
      drawGrid: true,
      background: { color: '#f8f9fa' },
      interactive: { vertexAdd: false }
    });
    
    // Handle node interactions
    setupInteractions();
    
    // Setup pan and zoom
    setupPanAndZoom();
    
    // Global context menu prevention for the entire paper (JointJS recommended)
    const globalContextHandler = (evt) => {
      if (graphContainer && graphContainer.contains(evt.target)) {
        console.log('🚫 Global context handler preventing default');
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }
    };
    document.addEventListener('contextmenu', globalContextHandler);
    
    // Store reference for cleanup
    graphContainer.globalContextHandler = globalContextHandler;
    
    isReady = true;
  });
  
  function setupInteractions() {
    console.log('🎭 Setting up interactions for paper');
    
    // Test function to check if events are still bound
    window.testPaperEvents = () => {
      console.log('📡 Paper event listeners:', paper._callbacks);
      console.log('📡 Element contextmenu handlers:', paper._callbacks['element:contextmenu']?.length || 0);
    };
    
    // Node position updates - only dispatch if position actually changed
    let originalPosition = new Map();
    
    paper.on('element:pointerdown', (elementView) => {
      const element = elementView.model;
      originalPosition.set(element.id, element.position());
    });
    
    paper.on('element:pointerup', (elementView) => {
      const element = elementView.model;
      const currentPosition = element.position();
      const originalPos = originalPosition.get(element.id);
      
      // Only dispatch if position actually changed (drag operation)
      if (originalPos && 
          (Math.abs(currentPosition.x - originalPos.x) > 1 || 
           Math.abs(currentPosition.y - originalPos.y) > 1)) {
        const size = element.size();
        dispatch('nodePositionUpdate', {
          nodeId: element.id,
          position: currentPosition,
          size: element.get('nodeType') === 'boundary' ? size : undefined
        });
      }
      
      originalPosition.delete(element.id);
    });
    
    // Manual double-click detection using pointerclick
    paper.on('element:pointerclick', (elementView, evt) => {
      const currentTime = Date.now();
      const elementId = elementView.model.id;
      const nodeData = nodes.find(n => n.id === elementId);
      
      // Check if this is a double-click
      if (lastClickedElement === elementId && 
          (currentTime - lastClickTime) < DOUBLE_CLICK_THRESHOLD) {
        console.log('🔥 Double-click detected on element:', elementId);
        evt.preventDefault();
        startInlineEdit(elementView);
        
        // Reset to prevent triple-click from triggering another edit
        lastClickTime = 0;
        lastClickedElement = null;
      } else {
        // Single click - handle tooltips based on node type
        if (nodeData) {
          if (nodeData.type === 'aggregate') {
            console.log('🎯 Aggregate node clicked, showing domain model tooltip:', elementId);
            showAggregateTooltip(elementView, evt, nodeData);
          } else if (nodeData.type === 'event') {
            console.log('🎯 Event node clicked, showing outcome tooltip:', elementId);
            showEventTooltip(elementView, evt, nodeData);
          }
        }
        
        // Update tracking variables for double-click detection
        lastClickTime = currentTime;
        lastClickedElement = elementId;
      }
    });
    
    // Node selection/context menu - Use browser event coordinates directly
    paper.on('element:contextmenu', (elementView, evt, x, y) => {
      console.log('🎯 element:contextmenu event triggered for:', elementView.model.id);
      console.log('🎯 Paper coords:', x, y);
      console.log('🎯 Browser event clientX/Y:', evt.clientX, evt.clientY);
      console.log('🎯 Current contextMenu state:', contextMenu ? 'exists' : 'null');
      evt.preventDefault();
      evt.stopPropagation();
      
        // Get element position for more accurate positioning
      const elementBBox = elementView.getBBox();
      const paperRect = paper.el.getBoundingClientRect();
      const transform = paper.matrix();
      
      // Calculate center of the element in screen coordinates
      const elementCenterX = elementBBox.x + elementBBox.width / 2;
      const elementCenterY = elementBBox.y + elementBBox.height / 2;
      
      // Transform to screen coordinates
      const screenX = paperRect.left + (elementCenterX * transform.a) + transform.e;
      const screenY = paperRect.top + (elementCenterY * transform.d) + transform.f;
      
      console.log('📦 Element bbox:', elementBBox);
      console.log('📄 Paper rect:', paperRect);
      console.log('🔄 Transform:', transform);
      console.log('🎯 Final screen coords:', screenX, screenY);
      
      showContextMenu(elementView, { clientX: screenX, clientY: screenY });
    });
    
    // Also handle blank area context menu to prevent browser menu
    paper.on('blank:contextmenu', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
    });
    
    // Clear context menu on blank area
    paper.on('blank:pointerdown', () => {
      console.log('🔄 blank:pointerdown - removing context menu');
      removeContextMenu();
    });
    
    // Clear context menu on any click (including on other nodes)
    paper.on('element:pointerdown', (elementView) => {
      console.log('🔄 element:pointerdown on', elementView.model.id, '- removing context menu');
      removeContextMenu();
    });
  }
  
  function setupPanAndZoom() {
    if (!paper || !graphContainer) return;
    
    let isPanning = false;
    let startPanPosition = { x: 0, y: 0 };
    
    // Mouse wheel zoom
    graphContainer.addEventListener('wheel', (evt) => {
      evt.preventDefault();
      
      const delta = evt.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.2, Math.min(3, scale + delta));
      
      if (newScale !== scale) {
        scale = newScale;
        paper.scale(scale, scale);
      }
    });
    
    // Pan with mouse drag on blank area
    paper.on('blank:pointerdown', (evt) => {
      removeContextMenu();
      isPanning = true;
      startPanPosition = { x: evt.clientX, y: evt.clientY };
      paper.el.style.cursor = 'grabbing';
    });
    
    // Handle panning
    graphContainer.addEventListener('mousemove', (evt) => {
      if (!isPanning) return;
      
      const dx = evt.clientX - startPanPosition.x;
      const dy = evt.clientY - startPanPosition.y;
      
      paperTranslate.x += dx;
      paperTranslate.y += dy;
      
      paper.translate(paperTranslate.x, paperTranslate.y);
      
      startPanPosition = { x: evt.clientX, y: evt.clientY };
    });
    
    // Stop panning
    graphContainer.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        paper.el.style.cursor = 'default';
      }
    });
    
    // Stop panning when mouse leaves container
    graphContainer.addEventListener('mouseleave', () => {
      if (isPanning) {
        isPanning = false;
        paper.el.style.cursor = 'default';
      }
    });
  }
  
  // Simple context menu
  let contextMenu = null;
  let contextMenuOpenTime = 0;
  
  function showContextMenu(elementView, evt) {
    console.log('🎯 showContextMenu called for:', elementView.model.id, 'at position:', evt.clientX, evt.clientY);
    console.log('🎯 Window size:', window.innerWidth, 'x', window.innerHeight);
    console.log('🎯 Event object keys:', Object.keys(evt));
    console.log('🎯 Event clientX/Y valid:', typeof evt.clientX === 'number', typeof evt.clientY === 'number');
    removeContextMenu();
    
    contextMenuOpenTime = Date.now();
    
    const element = elementView.model;
    contextMenu = document.createElement('div');
    contextMenu.className = 'jointjs-context-menu';
    
    // Ensure context menu appears within viewport bounds
    const menuWidth = 120;
    const menuHeight = 60;
    const x = Math.min(evt.clientX, window.innerWidth - menuWidth);
    const y = Math.min(evt.clientY, window.innerHeight - menuHeight);
    
    console.log('🎯 Final menu position:', x, y);
    
    contextMenu.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 10000;
      min-width: ${menuWidth}px;
      pointer-events: auto;
    `;
    
    // Prevent all interactions from bubbling
    contextMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    contextMenu.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    contextMenu.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    // Edit option
    const editItem = document.createElement('div');
    editItem.textContent = 'Edit Label';
    editItem.style.cssText = 'padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; user-select: none;';
    editItem.onclick = (e) => {
      e.stopPropagation();
      console.log('📝 Edit clicked');
      removeContextMenu();
      startInlineEdit(elementView);
    };
    
    // Delete option
    const deleteItem = document.createElement('div');
    deleteItem.textContent = 'Delete';
    deleteItem.style.cssText = 'padding: 8px 12px; cursor: pointer; color: #dc3545; user-select: none;';
    deleteItem.onclick = (e) => {
      e.stopPropagation();
      console.log('🗑️ Delete clicked');
      removeContextMenu();
      dispatch('nodeDelete', { nodeId: element.id });
    };
    
    contextMenu.appendChild(editItem);
    contextMenu.appendChild(deleteItem);
    document.body.appendChild(contextMenu);
    
    console.log('✅ Context menu added to DOM:', contextMenu.offsetWidth, 'x', contextMenu.offsetHeight);
    
    // Add global click listener to close menu - but ignore events too close to opening
    setTimeout(() => {
      const closeHandler = (e) => {
        // Ignore events that happen too soon after opening (likely the same event)
        const timeSinceOpen = Date.now() - contextMenuOpenTime;
        if (timeSinceOpen < 100) {
          console.log('🚫 Ignoring close event - too soon after opening:', timeSinceOpen + 'ms');
          return;
        }
        
        // Don't close if clicking inside the context menu
        if (contextMenu && !contextMenu.contains(e.target)) {
          console.log('🚪 Closing context menu due to outside click on:', e.target, 'after', timeSinceOpen + 'ms');
          removeContextMenu();
        }
      };
      document.addEventListener('click', closeHandler, { once: true });
      document.addEventListener('contextmenu', closeHandler, { once: true });
    }, 50); // Shorter delay but with time-based filtering
  }
  
  function removeContextMenu() {
    if (contextMenu) {
      console.log('🚪 Removing context menu');
      contextMenu.remove();
      contextMenu = null;
    }
  }
  
  function startInlineEdit(elementView) {
    console.log('✏️ startInlineEdit called for:', elementView.model.id);
    const element = elementView.model;
    const bbox = elementView.getBBox();
    const currentText = element.attr('label/text') || '';
    console.log('📝 Current text:', currentText, 'bbox:', bbox);
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.style.cssText = `
      position: absolute;
      left: ${bbox.x}px;
      top: ${bbox.y + bbox.height/2 - 10}px;
      width: ${bbox.width - 20}px;
      height: 20px;
      font-size: 14px;
      text-align: center;
      border: 2px solid #007acc;
      border-radius: 4px;
      z-index: 1000;
    `;
    
    graphContainer.appendChild(input);
    input.focus();
    input.select();
    
    const finishEdit = () => {
      const newText = input.value.trim();
      if (newText && newText !== currentText) {
        dispatch('nodeLabelUpdate', {
          nodeId: element.id,
          label: newText
        });
      }
      // Safe removal - check if input is still in DOM
      if (input.parentNode) {
        input.remove();
      }
    };
    
    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finishEdit();
      if (e.key === 'Escape') input.remove();
    });
  }
  
  // Render graph from props data
  function renderGraph() {
    if (!graph || !isReady) {
      return;
    }
    
    // Clear and rebuild
    graph.clear();
    
    const elements = [];
    const links = [];
    
    // Create nodes from props data
    (nodes || []).forEach(node => {
      const position = node.position || { x: 200 + Math.random() * 300, y: 200 + Math.random() * 300 };
      let size;
      
      if (node.type === 'boundary') {
        size = node.dimensions || { width: 20, height: 300 };
      } else if (node.type === 'guards' || node.type === 'preconditions' || node.type === 'branchinglogic') {
        // Auto-size business rule tags based on actual text width
        const text = node.label || node.id;
        const textWidth = measureTextWidth(text, 11, 'Arial, sans-serif');
        const padding = 16; // 8px on each side
        const minWidth = 40; // Minimum width for very short text
        size = { width: Math.max(minWidth, Math.ceil(textWidth + padding)), height: 24 };
      } else {
        size = { width: 144, height: 72 }; // 20% bigger for regular nodes
      }
      
      const element = new shapes.eventstorming[node.type]({
        id: node.id,
        position,
        size,
        nodeType: node.type,
        attrs: { label: { text: node.label || node.id } }
      });
      
      elements.push(element);
    });
    
    // Create edges from props data
    (edges || []).forEach(edge => {
      // Find source and target nodes to determine edge style
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      // Check if edge connects to business rule nodes
      const isBusinessRuleEdge = (sourceNode && ['guards', 'preconditions', 'branchinglogic'].includes(sourceNode.type)) ||
                                  (targetNode && ['guards', 'preconditions', 'branchinglogic'].includes(targetNode.type));
      
      // Regular dashed edges for actor/aggregate connections
      const isRegularDashed = (sourceNode && (sourceNode.type === 'aggregate' || sourceNode.type === 'actor')) ||
                             (targetNode && (targetNode.type === 'aggregate' || targetNode.type === 'actor'));
      
      let lineAttrs;
      
      if (isBusinessRuleEdge) {
        // Special styling for business rule edges
        const businessRuleNode = sourceNode && ['guards', 'preconditions', 'branchinglogic'].includes(sourceNode.type) 
          ? sourceNode : targetNode;
        const ruleColor = nodeColors[businessRuleNode.type];
        
        lineAttrs = {
          stroke: ruleColor,
          strokeWidth: 1,
          strokeDasharray: '3,3', // Smaller dashes for business rules
          // No arrow for business rule edges
        };
      } else {
        // Regular edge styling
        lineAttrs = { 
          stroke: '#666', 
          strokeWidth: 2, 
          targetMarker: { type: 'path', d: 'M 10 -5 0 0 10 5 z' } 
        };
        
        // Add dashing for regular actor/aggregate edges
        if (isRegularDashed) {
          lineAttrs.strokeDasharray = '5,5';
        }
      }
      
      const link = new shapes.standard.Link({
        source: { id: edge.source },
        target: { id: edge.target },
        attrs: {
          line: lineAttrs
        },
        labels: edge.label ? [{ attrs: { text: { text: edge.label, fontSize: 11 } } }] : []
      });
      
      links.push(link);
    });
    
    // Add nodes first, then edges
    console.log('🔧 About to add elements to graph:', elements.length);
    if (elements.length > 0) {
      graph.addCells(elements);
      console.log('✅ Added', elements.length, 'elements to graph');
    }
    if (links.length > 0) {
      // Only add edges where both nodes exist
      const validLinks = links.filter(link => {
        const source = graph.getCell(link.get('source').id);
        const target = graph.getCell(link.get('target').id);
        return source && target;
      });
      if (validLinks.length > 0) {
        graph.addCells(validLinks);
        console.log('✅ Added', validLinks.length, 'links to graph');
      }
    }
    
    // Send boundaries to back
    elements.filter(el => el.get('nodeType') === 'boundary').forEach(el => el.toBack());
    
    console.log('🎯 renderGraph complete - total cells in graph:', graph.getCells().length);
  }
  
  // React to prop changes - only when nodes/edges actually change
  let lastNodesHash = '';
  let lastEdgesHash = '';
  
  $: currentNodesHash = JSON.stringify(nodes?.map(n => ({ id: n.id, label: n.label, type: n.type, position: n.position })) || []);
  $: currentEdgesHash = JSON.stringify(edges || []);
  
  $: if (isReady && (currentNodesHash !== lastNodesHash || currentEdgesHash !== lastEdgesHash)) {
    lastNodesHash = currentNodesHash;
    lastEdgesHash = currentEdgesHash;
    renderGraph();
  }
  
  // Handle drag and drop from drawer
  function handleNodeAdd(event) {
    console.log('🎯 handleNodeAdd called in graph component:', event.detail);
    const { nodeType, position, targetElement, connectionType } = event.detail;
    
    dispatch('nodeAdd', {
      type: nodeType.type,
      label: `New ${nodeType.label}`,
      position,
      dimensions: nodeType.type === 'boundary' ? { width: 20, height: 300 } : undefined,
      targetElement,
      connectionType
    });
  }
  
  // Show aggregate tooltip
  function showAggregateTooltip(elementView, evt, nodeData) {
    // Check if tooltipManager is available
    if (!window.tooltipManager) {
      console.warn('⚠️ TooltipManager not available - tooltip cannot be shown');
      return;
    }
    
    // Calculate position near the clicked node
    const elementBBox = elementView.getBBox();
    const paper = elementView.paper;
    const paperRect = paper.el.getBoundingClientRect();
    const transform = paper.matrix();
    
    // Get center position of the element in screen coordinates
    const elementCenterX = elementBBox.x + elementBBox.width / 2;
    const elementCenterY = elementBBox.y + elementBBox.height / 2;
    
    // Transform to screen coordinates
    const screenX = paperRect.left + (elementCenterX * transform.a) + transform.e;
    const screenY = paperRect.top + (elementCenterY * transform.d) + transform.f;
    
    // Position tooltip offset from the node
    const tooltipPosition = {
      x: screenX + 20, // Offset to the right
      y: screenY - 50  // Offset upward
    };
    
    console.log('🎯 Showing aggregate tooltip for:', nodeData.id, 'at position:', tooltipPosition);
    
    // Show the domain model tooltip
    window.tooltipManager.showDomainModelTooltip(
      tooltipPosition,
      nodeData.id,
      nodeData.label,
      { nodeData } // Additional context
    );
  }
  
  // Show event tooltip
  function showEventTooltip(elementView, evt, nodeData) {
    // Check if tooltipManager is available
    if (!window.tooltipManager) {
      console.warn('⚠️ TooltipManager not available - tooltip cannot be shown');
      return;
    }
    
    // Calculate position near the clicked node
    const elementBBox = elementView.getBBox();
    const paper = elementView.paper;
    const paperRect = paper.el.getBoundingClientRect();
    const transform = paper.matrix();
    
    // Get center position of the element in screen coordinates
    const elementCenterX = elementBBox.x + elementBBox.width / 2;
    const elementCenterY = elementBBox.y + elementBBox.height / 2;
    
    // Transform to screen coordinates
    const screenX = paperRect.left + (elementCenterX * transform.a) + transform.e;
    const screenY = paperRect.top + (elementCenterY * transform.d) + transform.f;
    
    // Position tooltip offset from the node
    const tooltipPosition = {
      x: screenX + 20, // Offset to the right
      y: screenY - 50  // Offset upward
    };
    
    console.log('🎯 Showing event outcome tooltip for:', nodeData.id, 'at position:', tooltipPosition);
    
    // Show the outcome tooltip
    window.tooltipManager.showOutcomeTooltip(
      tooltipPosition,
      nodeData.id,
      nodeData.label,
      { nodeData } // Additional context
    );
  }
  
  // Public methods
  export function resetView() {
    if (paper) {
      // Reset zoom and pan
      scale = 1;
      paperTranslate = { x: 0, y: 0 };
      paper.scale(scale, scale);
      paper.translate(0, 0);
      
      // Fit content to view
      paper.scaleContentToFit({ padding: 50, maxScale: 1.5, minScale: 0.3 });
      
      // Update scale to match the fitted scale
      const transform = paper.matrix();
      scale = transform.a; // Get the actual scale from transform matrix
    }
  }
  
  onDestroy(() => {
    removeContextMenu();
    // Clean up global context menu handler
    if (graphContainer && graphContainer.globalContextHandler) {
      document.removeEventListener('contextmenu', graphContainer.globalContextHandler);
    }
    if (paper) paper.remove();
  });
</script>

<!-- Drawer with paper reference for drag and drop -->
<EventStormingDrawer {paper} isOpen={true} on:nodeAdd={handleNodeAdd} />

<div class="graph-container" bind:this={graphContainer} style="width: {width}; height: {height};">
  <!-- Graph goes here -->
</div>

<style>
  .graph-container {
    position: relative;
    overflow: hidden;
    background: #f8f9fa;
  }
  
  /* Ensure drawer appears above graph */
  :global(.drawer-container) {
    z-index: 1001 !important;
  }
</style>