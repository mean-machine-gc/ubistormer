/**
 * EventStorming Store - Reactive store backed by EventStorming API
 * Maintains unidirectional data flow: Events → API mutations → Reactive updates
 * Combines domain expertise with Svelte reactivity
 */
import { writable, derived, get } from 'svelte/store';
import { EventStormingAPI } from '../eventstorming-api.js';
import type { 
  EventStormingGraph, 
  EventStormingNode, 
  EventStormingEdge, 
  NodeType,
  ValidationResult,
  ProcessFlow,
  AggregateView
} from '../eventstorming-api.js';

// === CORE API STORE ===
// Single source of truth - EventStorming API instance
const createEventStormingAPI = () => {
  const api = new EventStormingAPI();
  return writable(api);
};

export const apiStore = createEventStormingAPI();

// Helper to trigger reactivity after API mutations
const triggerReactivity = () => {
  const currentAPI = get(apiStore);
  apiStore.set(currentAPI);
};

// === REACTIVE GRAPH DATA ===
// Pure reactive data derived from API state
export const graphData = derived(
  apiStore, 
  ($api) => $api.getGraph()
);

// === FILTERS (same as before) ===
export const filters = writable({
  visibleNodeTypes: new Set<NodeType>([
    'actor', 'command', 'aggregate', 'event', 'viewmodel', 
    'preconditions', 'guards', 'branchinglogic', 'boundary'
  ])
});

// === APP STATE ===
export const appState = writable({
  isLoading: false,
  isInitialized: false,
  lastValidation: null as ValidationResult | null
});

// === REACTIVE DERIVED DATA ===
// Filtered nodes - combines API data with filter state
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

// Enhanced graph stats using API capabilities
export const graphStats = derived(
  apiStore,
  ($api) => $api.getStatistics()
);

// === ADVANCED REACTIVE DATA ===
// Process flows - reactive business process analysis
export const processFlows = derived(
  apiStore,
  ($api) => $api.getAllProcessFlows()
);

// Aggregate views - reactive aggregate analysis
export const aggregateViews = derived(
  apiStore,
  ($api) => $api.getAllAggregateViews()
);

// Graph validation - reactive methodology compliance
export const graphValidation = derived(
  apiStore,
  ($api) => $api.validateGraph()
);

// Graph health metrics - reactive system health
export const graphHealth = derived(
  apiStore,
  ($api) => $api.getGraphHealthMetrics()
);

// Critical nodes analysis - reactive bottleneck detection
export const criticalNodes = derived(
  apiStore,
  ($api) => $api.findCriticalNodes()
);

// === GRAPH OPERATIONS WITH VALIDATION ===
// All operations maintain unidirectional flow: Event → API → Reactive update
export const graphOperations = {
  
  // === BASIC CRUD OPERATIONS ===
  
  /**
   * Add node with validation
   * Returns: { success: boolean, result: ValidationResult, node?: EventStormingNode }
   */
  addNode: (nodeData: Partial<EventStormingNode>) => {
    const api = get(apiStore);
    
    // Create proper node structure
    const node: EventStormingNode = {
      id: nodeData.id || `${nodeData.type}-${Date.now()}`,
      label: nodeData.label || `New ${nodeData.type}`,
      type: nodeData.type!,
      // Include all provided fields
      ...(nodeData.description && { description: nodeData.description }),
      ...(nodeData.position && { position: nodeData.position }),
      ...(nodeData.dimensions && { dimensions: nodeData.dimensions }),
      ...(nodeData.subtype && { subtype: nodeData.subtype }),
      ...(nodeData.yaml && { yaml: nodeData.yaml }),
      ...(nodeData.businessContext && { businessContext: nodeData.businessContext }),
      ...(nodeData.assertion && { assertion: nodeData.assertion }),
      ...(nodeData.coreCommand && { coreCommand: nodeData.coreCommand }),
      ...(nodeData.shellCommand && { shellCommand: nodeData.shellCommand }),
      ...(nodeData.hydrationFunction && { hydrationFunction: nodeData.hydrationFunction }),
      ...(nodeData.outcomeAssertions && { outcomeAssertions: nodeData.outcomeAssertions }),
      ...(nodeData.exampleState && { exampleState: nodeData.exampleState }),
      ...(nodeData.domainModel && { domainModel: nodeData.domainModel }),
      ...(nodeData.objectExamples && { objectExamples: nodeData.objectExamples })
    };
    
    const result = api.addNode(node);
    
    if (result.isValid) {
      triggerReactivity();
      return { success: true, result, node };
    }
    
    console.warn('❌ Node validation failed:', result.errors);
    return { success: false, result };
  },

  /**
   * Update node with validation
   */
  updateNode: (nodeId: string, updates: Partial<EventStormingNode>) => {
    const api = get(apiStore);
    const result = api.updateNode(nodeId, updates);
    
    if (result.isValid) {
      triggerReactivity();
      return { success: true, result };
    }
    
    console.warn('❌ Node update validation failed:', result.errors);
    return { success: false, result };
  },

  /**
   * Delete node with impact analysis
   */
  deleteNode: (nodeId: string) => {
    const api = get(apiStore);
    
    // Optional: Get impact analysis before deletion
    const impact = api.getChangeImpactAnalysis(nodeId);
    
    const result = api.removeNode(nodeId);
    
    if (result.isValid) {
      triggerReactivity();
      return { success: true, result, impact };
    }
    
    console.warn('❌ Node deletion failed:', result.errors);
    return { success: false, result, impact };
  },

  /**
   * Add edge with validation
   */
  addEdge: (edgeData: EventStormingEdge) => {
    const api = get(apiStore);
    const result = api.addEdge(edgeData);
    
    if (result.isValid) {
      triggerReactivity();
      return { success: true, result };
    }
    
    console.warn('❌ Edge validation failed:', result.errors);
    return { success: false, result };
  },

  /**
   * Load complete graph data
   */
  loadGraph: (data: EventStormingGraph) => {
    const api = get(apiStore);
    api.loadGraph(data);
    triggerReactivity();
    
    // Update app state
    appState.update(state => ({ 
      ...state, 
      isInitialized: true,
      lastValidation: api.validateGraph()
    }));
  },

  /**
   * Clear graph
   */
  clearGraph: () => {
    const api = get(apiStore);
    api.loadGraph({ nodes: [], edges: [] });
    triggerReactivity();
  },

  // === HIGH-LEVEL EVENTSTORMING OPERATIONS ===

  /**
   * Create complete command flow with validation
   */
  createCommandFlow: (params: {
    actorId: string;
    actorLabel: string;
    commandId: string;
    commandLabel: string;
    aggregateId: string;
    aggregateLabel: string;
    eventId: string;
    eventLabel: string;
    description?: string;
  }) => {
    const api = get(apiStore);
    const result = api.createCommandFlow(params);
    
    if (result.isValid) {
      triggerReactivity();
      return { success: true, result };
    }
    
    console.warn('❌ Command flow creation failed:', result.errors);
    return { success: false, result };
  },

  /**
   * Add guards to command with validation
   */
  addCommandGuards: (commandId: string, guards: Array<{id: string, label: string, description?: string}>) => {
    const api = get(apiStore);
    const result = api.addCommandGuards(commandId, guards);
    
    if (result.isValid) {
      triggerReactivity();
      return { success: true, result };
    }
    
    console.warn('❌ Guard addition failed:', result.errors);
    return { success: false, result };
  },

  /**
   * Add preconditions to command with validation
   */
  addCommandPreconditions: (commandId: string, preconditions: Array<{id: string, label: string, description?: string}>) => {
    const api = get(apiStore);
    const result = api.addCommandPreconditions(commandId, preconditions);
    
    if (result.isValid) {
      triggerReactivity();
      return { success: true, result };
    }
    
    console.warn('❌ Precondition addition failed:', result.errors);
    return { success: false, result };
  }
};

// === ADVANCED ANALYSIS OPERATIONS ===
// These are read-only operations that don't trigger reactivity
export const analysisOperations = {
  
  /**
   * Get process flow for a command
   */
  getProcessFlow: (commandId: string): ProcessFlow | null => {
    const api = get(apiStore);
    return api.getProcessFlow(commandId);
  },

  /**
   * Get aggregate view
   */
  getAggregateView: (aggregateId: string): AggregateView | null => {
    const api = get(apiStore);
    return api.getAggregateView(aggregateId);
  },

  /**
   * Analyze impact of changing a node
   */
  analyzeImpact: (nodeId: string) => {
    const api = get(apiStore);
    return api.getChangeImpactAnalysis(nodeId);
  },

  /**
   * Find processes involving an event
   */
  getProcessesByEvent: (eventId: string): ProcessFlow[] => {
    const api = get(apiStore);
    return api.getProcessesByEvent(eventId);
  },

  /**
   * Find aggregates affected by an actor
   */
  getAggregatesByActor: (actorId: string): AggregateView[] => {
    const api = get(apiStore);
    return api.getAggregatesByActor(actorId);
  },

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies: () => {
    const api = get(apiStore);
    return api.detectCircularDependencies();
  },

  /**
   * Get command execution paths
   */
  getCommandExecutionPaths: (commandId: string) => {
    const api = get(apiStore);
    return api.getCommandExecutionPaths(commandId);
  },

  /**
   * Analyze aggregate health
   */
  analyzeAggregateHealth: (aggregateId: string) => {
    const api = get(apiStore);
    return api.analyzeAggregateHealth(aggregateId);
  },

  /**
   * Validate EventStorming methodology
   */
  validateMethodology: () => {
    const api = get(apiStore);
    return api.validateEventStormingMethodology();
  }
};

// === FILE OPERATIONS ===
export const fileOperations = {
  
  /**
   * Load from file
   */
  loadFromFile: async (filePath?: string): Promise<ValidationResult> => {
    const api = get(apiStore);
    const result = await api.loadFromFile(filePath);
    
    if (result.isValid) {
      triggerReactivity();
      appState.update(state => ({ 
        ...state, 
        isInitialized: true,
        lastValidation: result
      }));
    }
    
    return result;
  },

  /**
   * Save to file
   */
  saveToFile: async (filePath?: string): Promise<ValidationResult> => {
    const api = get(apiStore);
    return await api.saveToFile(filePath);
  },

  /**
   * Export to JSON
   */
  exportToJSON: (): string => {
    const api = get(apiStore);
    return api.exportToJSON();
  },

  /**
   * Import from JSON
   */
  importFromJSON: (jsonString: string): ValidationResult => {
    const api = get(apiStore);
    const result = api.importFromJSON(jsonString);
    
    if (result.isValid) {
      triggerReactivity();
      appState.update(state => ({ 
        ...state, 
        isInitialized: true,
        lastValidation: result
      }));
    }
    
    return result;
  }
};