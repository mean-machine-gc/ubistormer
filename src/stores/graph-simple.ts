import { writable, derived } from 'svelte/store';
import type { 
  EventStormingGraph, 
  EventStormingNode, 
  EventStormingEdge, 
  NodeType 
} from '../eventstorming-api.js';

// === SINGLE SOURCE OF TRUTH ===
// Main graph data - this is the only store that matters
export const graphData = writable<EventStormingGraph>({
  nodes: [],
  edges: []
});

// === SIMPLE FILTERS ===
export const filters = writable({
  visibleNodeTypes: new Set<NodeType>([
    'actor', 'command', 'aggregate', 'event', 'viewmodel', 
    'preconditions', 'guards', 'branchinglogic', 'boundary'
  ])
});

// === APP STATE ===
export const appState = writable({
  isLoading: false,
  isInitialized: false
});

// === DERIVED DATA (ONLY WHAT'S NEEDED) ===
// Filtered nodes - simple type-based filtering
export const filteredNodes = derived(
  [graphData, filters],
  ([data, filterState]) => {
    if (!data.nodes) return [];
    return data.nodes.filter(node => filterState.visibleNodeTypes.has(node.type));
  }
);

// Filtered edges - only show edges between visible nodes
export const filteredEdges = derived(
  [graphData, filteredNodes],
  ([data, visibleNodes]) => {
    if (!data.edges || !visibleNodes) return [];
    
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    return data.edges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
  }
);

// Simple graph stats
export const graphStats = derived(
  [filteredNodes, filteredEdges],
  ([nodes, edges]) => ({
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodesByType: nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<NodeType, number>)
  })
);

// === SIMPLE GRAPH OPERATIONS ===
export const graphOperations = {
  // Add node - respects EventStorming node structure
  addNode: (nodeData: Partial<EventStormingNode>) => {
    const newNode: EventStormingNode = {
      id: nodeData.id || `${nodeData.type}-${Date.now()}`,
      label: nodeData.label || `New ${nodeData.type}`,
      type: nodeData.type!,
      // Only include fields that exist for this node type
      ...(nodeData.description && { description: nodeData.description }),
      ...(nodeData.position && { position: nodeData.position }),
      ...(nodeData.dimensions && { dimensions: nodeData.dimensions }),
      ...(nodeData.subtype && { subtype: nodeData.subtype }),
      // Extended fields (if provided)
      ...(nodeData.businessContext && { businessContext: nodeData.businessContext }),
      ...(nodeData.assertion && { assertion: nodeData.assertion }),
      ...(nodeData.coreCommand && { coreCommand: nodeData.coreCommand }),
      ...(nodeData.shellCommand && { shellCommand: nodeData.shellCommand }),
      ...(nodeData.hydrationFunction && { hydrationFunction: nodeData.hydrationFunction }),
      ...(nodeData.outcomeAssertions && { outcomeAssertions: nodeData.outcomeAssertions }),
      ...(nodeData.exampleState && { exampleState: nodeData.exampleState }),
      ...(nodeData.domainModel && { domainModel: nodeData.domainModel })
    };
    
    graphData.update(data => ({
      ...data,
      nodes: [...data.nodes, newNode]
    }));
    
    return newNode;
  },

  // Delete node and connected edges
  deleteNode: (nodeId: string) => {
    graphData.update(data => ({
      nodes: data.nodes.filter(n => n.id !== nodeId),
      edges: data.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    }));
  },

  // Update node - respects existing node structure
  updateNode: (nodeId: string, updates: Partial<EventStormingNode>) => {
    graphData.update(data => ({
      ...data,
      nodes: data.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));
  },

  // Add edge - uses proper EventStorming edge structure
  addEdge: (edgeData: EventStormingEdge) => {
    graphData.update(data => ({
      ...data,
      edges: [...data.edges, edgeData]
    }));
  },

  // Load complete graph data
  loadGraph: (data: EventStormingGraph) => {
    graphData.set({
      nodes: data.nodes || [],
      edges: data.edges || []
    });
  },

  // Clear graph
  clearGraph: () => {
    graphData.set({ nodes: [], edges: [] });
  }
};