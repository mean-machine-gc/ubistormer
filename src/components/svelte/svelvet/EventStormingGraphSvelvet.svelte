<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { Svelvet, Node, Anchor, Edge, Controls } from 'svelvet';
  import { writable } from 'svelte/store';
  import EventStormingDrawerSvelvet from './EventStormingDrawerSvelvet.svelte';
  
  export let nodes = [];
  export let edges = [];
  export let onNodeClick = () => {};
  export let onNodeDoubleClick = () => {};
  export let onNodePositionChange = () => {};
  
  const dispatch = createEventDispatcher();
  
  // Dynamic node/edge stores for Svelvet
  let svelvetNodes = writable([]);
  let svelvetEdges = writable([]);
  
  // Track mounted state
  let mounted = false;
  
  // Track click position for drawer
  let clickPosition = { x: 0, y: 0 };
  
  // Node type configurations with anchor positions
  const nodeConfigs = {
    actor: {
      bgColor: '#FFE4B5',
      borderColor: '#DDA520',
      width: 144,
      height: 72,
      anchors: {
        output: [{ id: 'out', position: 'right' }]
      }
    },
    command: {
      bgColor: '#E6F3FF',
      borderColor: '#4169E1',
      width: 144,
      height: 72,
      anchors: {
        input: [{ id: 'in', position: 'left' }],
        output: [
          { id: 'out', position: 'right' },
          { id: 'guard-out', position: 'bottom' },
          { id: 'precondition-out', position: 'top' }
        ]
      }
    },
    aggregate: {
      bgColor: '#FFFACD',
      borderColor: '#FFD700',
      width: 144,
      height: 72,
      anchors: {
        input: [{ id: 'in', position: 'left' }],
        output: [{ id: 'out', position: 'right' }]
      }
    },
    event: {
      bgColor: '#FFE4E1',
      borderColor: '#FF6347',
      width: 144,
      height: 72,
      anchors: {
        input: [{ id: 'in', position: 'left' }],
        output: [
          { id: 'out', position: 'right' },
          { id: 'branch-out', position: 'bottom' }
        ]
      }
    },
    viewmodel: {
      bgColor: '#E6E6FA',
      borderColor: '#9370DB',
      width: 144,
      height: 72,
      anchors: {
        input: [{ id: 'in', position: 'left' }],
        output: [{ id: 'out', position: 'right' }]
      }
    },
    guards: {
      bgColor: '#D8BFD8',
      borderColor: '#8B008B',
      width: 100,
      height: 30,
      isTag: true,
      anchors: {
        input: [{ id: 'in', position: 'top' }]
      }
    },
    preconditions: {
      bgColor: '#FFA07A',
      borderColor: '#FF4500',
      width: 100,
      height: 30,
      isTag: true,
      anchors: {
        input: [{ id: 'in', position: 'bottom' }]
      }
    },
    branchinglogic: {
      bgColor: '#98FB98',
      borderColor: '#228B22',
      width: 100,
      height: 30,
      isTag: true,
      anchors: {
        input: [{ id: 'in', position: 'top' }]
      }
    }
  };
  
  // Edge type configurations
  const edgeConfigs = {
    'issues': { color: '#DDA520', animate: false },
    'on': { color: '#4169E1', animate: false },
    'then': { color: '#FF6347', animate: false },
    'if': { color: '#228B22', animate: false },
    'if guard': { color: '#8B008B', animate: false, type: 'step', width: 2 },
    'if preconditions': { color: '#FF4500', animate: false, type: 'step', width: 2 },
    'then (policy)': { color: '#FF6347', animate: true, type: 'bezier' },
    'supports decision for': { color: '#9370DB', animate: false }
  };
  
  // Convert EventStorming nodes to Svelvet nodes
  function convertNodes(eventStormingNodes) {
    return eventStormingNodes.map(node => {
      const config = nodeConfigs[node.type] || nodeConfigs.event;
      const position = node.position || { x: 100, y: 100 };
      
      return {
        id: node.id,
        position: { x: position.x, y: position.y },
        data: {
          label: node.label,
          type: node.type,
          originalNode: node
        },
        width: config.width,
        height: config.height,
        bgColor: config.bgColor,
        borderColor: config.borderColor,
        borderWidth: 2,
        inputs: config.anchors?.input?.length || 0,
        outputs: config.anchors?.output?.length || 0,
        // Custom properties for our use
        clickable: true,
        draggable: true
      };
    });
  }
  
  // Determine which anchor to use based on edge label
  function getAnchorIds(sourceType, targetType, edgeLabel) {
    let sourceAnchor = 'out';
    let targetAnchor = 'in';
    
    if (edgeLabel === 'if guard') {
      sourceAnchor = 'guard-out';
    } else if (edgeLabel === 'if preconditions') {
      sourceAnchor = 'precondition-out';
    } else if (edgeLabel === 'if' && sourceType === 'event') {
      sourceAnchor = 'branch-out';
    }
    
    return { sourceAnchor, targetAnchor };
  }
  
  // Convert EventStorming edges to Svelvet edges
  function convertEdges(eventStormingEdges, nodeMap) {
    return eventStormingEdges.map((edge, index) => {
      const sourceNode = nodeMap[edge.source];
      const targetNode = nodeMap[edge.target];
      
      if (!sourceNode || !targetNode) {
        console.warn(`Edge missing node: ${edge.source} -> ${edge.target}`);
        return null;
      }
      
      const edgeConfig = edgeConfigs[edge.label] || edgeConfigs['then'];
      const { sourceAnchor, targetAnchor } = getAnchorIds(
        sourceNode.type,
        targetNode.type,
        edge.label
      );
      
      return {
        id: `${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        sourceAnchor,
        targetAnchor,
        type: edgeConfig.type || 'bezier',
        animate: edgeConfig.animate,
        color: edgeConfig.color,
        width: edgeConfig.width || 2,
        label: edge.label,
        labelBgColor: '#1e1e1e',
        labelTextColor: '#fff'
      };
    }).filter(Boolean);
  }
  
  // Update Svelvet graph when props change
  $: if (mounted && nodes && edges) {
    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);
    
    const convertedNodes = convertNodes(nodes);
    const convertedEdges = convertEdges(edges, nodeMap);
    
    // Use dynamic update to handle edge creation properly
    updateGraphDynamically(convertedNodes, convertedEdges);
  }
  
  // Dynamic update function to handle edge creation
  function updateGraphDynamically(newNodes, newEdges) {
    // Get current state
    const currentNodes = $svelvetNodes;
    const currentEdges = $svelvetEdges;
    
    // Update nodes first
    svelvetNodes.set(newNodes);
    
    // Small delay to ensure nodes are rendered before edges
    setTimeout(() => {
      svelvetEdges.set(newEdges);
    }, 50);
  }
  
  // Handle node interactions
  function handleNodeClick(e) {
    const nodeData = e.detail.node.data;
    onNodeClick(nodeData.originalNode);
  }
  
  function handleNodeDoubleClick(e) {
    const nodeData = e.detail.node.data;
    const originalNode = nodeData.originalNode;
    
    // Show inline edit prompt
    const newLabel = prompt('Edit node label:', originalNode.label);
    if (newLabel && newLabel !== originalNode.label) {
      // Dispatch label update event
      dispatch('nodeLabelUpdate', {
        nodeId: originalNode.id,
        label: newLabel
      });
    } else {
      // Still call the original handler for tooltip display
      onNodeDoubleClick(originalNode);
    }
  }
  
  function handleNodeMove(e) {
    const nodeId = e.detail.node.id;
    const position = e.detail.node.position;
    // Match the JointJS event format
    onNodePositionChange({ detail: { nodeId, position } });
  }
  
  // Handle drawer events
  function handleDrawerAddNode(event) {
    const { type, label, targetElement, connectionType, isBoundary, boundarySize } = event.detail;
    
    // Calculate world position from screen position
    const worldPos = {
      x: (clickPosition.x - currentTranslate.x) / currentScale,
      y: (clickPosition.y - currentTranslate.y) / currentScale
    };
    
    // Dispatch the add node event to parent
    dispatch('nodeAdd', {
      type,
      label,
      position: worldPos,
      targetElement,
      connectionType,
      dimensions: boundarySize
    });
  }
  
  // Track canvas clicks for drawer position
  function handleCanvasClick(e) {
    // Store the click position for the drawer
    const rect = e.currentTarget.getBoundingClientRect();
    clickPosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
  
  // Handle drag over to allow dropping
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }
  
  // Handle drop on canvas
  function handleDrop(e) {
    e.preventDefault();
    
    const nodeTypeData = e.dataTransfer.getData('nodeType');
    if (!nodeTypeData) return;
    
    const nodeType = JSON.parse(nodeTypeData);
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Simple position calculation
    const dropPosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // Create node with default label
    dispatch('nodeAdd', {
      type: nodeType.type,
      label: `New ${nodeType.label}`,
      position: dropPosition
    });
  }
  
  
  onMount(() => {
    mounted = true;
  });
  
  onDestroy(() => {
    mounted = false;
  });
</script>

<div 
  class="svelvet-container"
  on:click={handleCanvasClick}
>
  <Svelvet
    nodes={$svelvetNodes}
    edges={$svelvetEdges}
    width={2000}
    height={1500}
    zoom={0.8}
    minimap
    controls
    background
    on:nodeClick={handleNodeClick}
    on:nodeDblClick={handleNodeDoubleClick}
    on:nodeMove={handleNodeMove}
  >
    {#each $svelvetNodes as node (node.id)}
      <Node
        id={node.id}
        position={node.position}
        width={node.width}
        height={node.height}
        bgColor={node.bgColor}
        borderColor={node.borderColor}
        borderWidth={node.borderWidth}
        inputs={node.inputs}
        outputs={node.outputs}
        clickable={node.clickable}
        draggable={node.draggable}
      >
        <div class="node-content {node.data.type}">
          <span class="node-label">{node.data.label}</span>
        </div>
        
        <!-- Define anchors based on node type -->
        {#if nodeConfigs[node.data.type]?.anchors}
          {#each nodeConfigs[node.data.type].anchors.input || [] as anchor}
            <Anchor
              id={anchor.id}
              position={anchor.position}
              input
            />
          {/each}
          {#each nodeConfigs[node.data.type].anchors.output || [] as anchor}
            <Anchor
              id={anchor.id}
              position={anchor.position}
              output
            />
          {/each}
        {/if}
      </Node>
    {/each}
    
    {#each $svelvetEdges as edge (edge.id)}
      <Edge
        id={edge.id}
        source={edge.source}
        target={edge.target}
        sourceAnchor={edge.sourceAnchor}
        targetAnchor={edge.targetAnchor}
        type={edge.type}
        animate={edge.animate}
        color={edge.color}
        width={edge.width}
        label={edge.label}
        labelBgColor={edge.labelBgColor}
        labelTextColor={edge.labelTextColor}
      />
    {/each}
  </Svelvet>
  
  <!-- EventStorming Drawer for Svelvet -->
  <EventStormingDrawerSvelvet 
    nodes={nodes}
    position={clickPosition}
    on:addNode={handleDrawerAddNode}
  />
</div>

<style>
  .svelvet-container {
    width: 100%;
    height: 100vh;
    background: #1e1e1e;
    position: relative;
  }
  
  
  .node-content {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    box-sizing: border-box;
  }
  
  .node-label {
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    word-wrap: break-word;
    overflow-wrap: break-word;
    max-width: 100%;
    line-height: 1.3;
  }
  
  /* Node type specific styles */
  .node-content.actor .node-label {
    color: #8B4513;
  }
  
  .node-content.command .node-label {
    color: #1E3A8A;
  }
  
  .node-content.aggregate .node-label {
    color: #B8860B;
  }
  
  .node-content.event .node-label {
    color: #8B0000;
  }
  
  .node-content.viewmodel .node-label {
    color: #4B0082;
  }
  
  .node-content.guards .node-label,
  .node-content.preconditions .node-label,
  .node-content.branchinglogic .node-label {
    font-size: 11px;
    color: #333;
  }
  
  /* Override Svelvet default styles for better visibility */
  :global(.svelvet-minimap) {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  :global(.svelvet-controls) {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  :global(.svelvet-controls button) {
    color: white;
  }
</style>