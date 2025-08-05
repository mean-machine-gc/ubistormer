/**
 * GraphologyAdapter - High-performance graph operations for EventStorming
 * Uses Graphology library for efficient graph manipulation and analysis
 */
import Graph from 'graphology';
import type { 
  EventStormingGraph, 
  EventStormingNode, 
  EventStormingEdge, 
  NodeType,
  EdgeLabel 
} from '../eventstorming-api.js';

export class GraphologyAdapter {
  private graph: Graph;

  constructor() {
    this.graph = new Graph({ type: 'directed', multi: false });
  }

  // ==================== BASIC OPERATIONS ====================

  /**
   * Load EventStorming data into the Graphology graph
   */
  loadFromEventStormingData(data: EventStormingGraph): void {
    this.graph.clear();
    
    // Safely handle potentially undefined data
    const nodes = data?.nodes || [];
    const edges = data?.edges || [];
    
    // Add nodes
    nodes.forEach(node => {
      this.graph.addNode(node.id, node);
    });

    // Add edges
    edges.forEach(edge => {
      if (this.graph.hasNode(edge.source) && this.graph.hasNode(edge.target)) {
        // Use edge label as key to allow multiple edges with different labels
        const edgeKey = `${edge.source}-${edge.label}-${edge.target}`;
        if (!this.graph.hasEdge(edgeKey)) {
          this.graph.addEdgeWithKey(edgeKey, edge.source, edge.target, edge);
        }
      }
    });
  }

  /**
   * Export Graphology graph to EventStorming format
   */
  exportToEventStormingData(): EventStormingGraph {
    const nodes: EventStormingNode[] = [];
    const edges: EventStormingEdge[] = [];

    // Export nodes
    this.graph.forEachNode((nodeId, attributes) => {
      nodes.push(attributes as EventStormingNode);
    });

    // Export edges
    this.graph.forEachEdge((edgeId, attributes) => {
      edges.push(attributes as EventStormingEdge);
    });

    return { nodes, edges };
  }

  // ==================== NODE OPERATIONS ====================

  addNode(node: EventStormingNode): boolean {
    if (this.graph.hasNode(node.id)) {
      return false;
    }
    this.graph.addNode(node.id, node);
    return true;
  }

  hasNode(nodeId: string): boolean {
    return this.graph.hasNode(nodeId);
  }

  getNode(nodeId: string): EventStormingNode | null {
    if (!this.graph.hasNode(nodeId)) {
      return null;
    }
    return this.graph.getNodeAttributes(nodeId) as EventStormingNode;
  }

  updateNode(nodeId: string, updates: Partial<EventStormingNode>): boolean {
    if (!this.graph.hasNode(nodeId)) {
      return false;
    }
    const currentNode = this.graph.getNodeAttributes(nodeId) as EventStormingNode;
    const updatedNode = { ...currentNode, ...updates };
    this.graph.replaceNodeAttributes(nodeId, updatedNode);
    return true;
  }

  removeNode(nodeId: string): boolean {
    if (!this.graph.hasNode(nodeId)) {
      return false;
    }
    this.graph.dropNode(nodeId);
    return true;
  }

  getNodesByType(type: NodeType): EventStormingNode[] {
    const nodes: EventStormingNode[] = [];
    this.graph.forEachNode((nodeId, attributes) => {
      const node = attributes as EventStormingNode;
      if (node.type === type) {
        nodes.push(node);
      }
    });
    return nodes;
  }

  filterNodes(predicate: (node: EventStormingNode) => boolean): EventStormingNode[] {
    const nodes: EventStormingNode[] = [];
    this.graph.forEachNode((nodeId, attributes) => {
      const node = attributes as EventStormingNode;
      if (predicate(node)) {
        nodes.push(node);
      }
    });
    return nodes;
  }

  // ==================== EDGE OPERATIONS ====================

  addEdge(edge: EventStormingEdge): boolean {
    const edgeKey = `${edge.source}-${edge.label}-${edge.target}`;
    if (this.graph.hasEdge(edgeKey)) {
      return false;
    }
    if (!this.graph.hasNode(edge.source) || !this.graph.hasNode(edge.target)) {
      return false;
    }
    this.graph.addEdgeWithKey(edgeKey, edge.source, edge.target, edge);
    return true;
  }

  removeEdge(source: string, target: string, label: EdgeLabel): boolean {
    const edgeKey = `${source}-${label}-${target}`;
    if (!this.graph.hasEdge(edgeKey)) {
      return false;
    }
    this.graph.dropEdge(edgeKey);
    return true;
  }

  getNodeEdges(nodeId: string): EventStormingEdge[] {
    if (!this.graph.hasNode(nodeId)) {
      return [];
    }
    
    const edges: EventStormingEdge[] = [];
    this.graph.forEachEdge(nodeId, (edgeId, attributes) => {
      edges.push(attributes as EventStormingEdge);
    });
    return edges;
  }

  filterEdges(predicate: (edge: EventStormingEdge) => boolean): EventStormingEdge[] {
    const edges: EventStormingEdge[] = [];
    this.graph.forEachEdge((edgeId, attributes) => {
      const edge = attributes as EventStormingEdge;
      if (predicate(edge)) {
        edges.push(edge);
      }
    });
    return edges;
  }

  // ==================== GRAPH ANALYSIS ====================

  /**
   * Get neighbors by edge label
   */
  getOutNeighborsByLabel(nodeId: string, label: EdgeLabel): EventStormingNode[] {
    if (!this.graph.hasNode(nodeId)) {
      return [];
    }

    const neighbors: EventStormingNode[] = [];
    this.graph.forEachOutEdge(nodeId, (edgeId, attributes, source, target) => {
      const edge = attributes as EventStormingEdge;
      if (edge.label === label) {
        const targetNode = this.graph.getNodeAttributes(target) as EventStormingNode;
        neighbors.push(targetNode);
      }
    });
    return neighbors;
  }

  getInNeighborsByLabel(nodeId: string, label: EdgeLabel): EventStormingNode[] {
    if (!this.graph.hasNode(nodeId)) {
      return [];
    }

    const neighbors: EventStormingNode[] = [];
    this.graph.forEachInEdge(nodeId, (edgeId, attributes, source, target) => {
      const edge = attributes as EventStormingEdge;
      if (edge.label === label) {
        const sourceNode = this.graph.getNodeAttributes(source) as EventStormingNode;
        neighbors.push(sourceNode);
      }
    });
    return neighbors;
  }

  /**
   * Detect cycles in the graph
   */
  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      this.graph.forEachOutNeighbor(nodeId, (neighbor) => {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycles.push([...cycle, neighbor]);
        }
      });

      recStack.delete(nodeId);
      path.pop();
      return false;
    };

    this.graph.forEachNode((nodeId) => {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    });

    return cycles;
  }

  /**
   * Get impact analysis for a node
   */
  getImpactAnalysis(nodeId: string): {
    directImpact: EventStormingNode[],
    indirectImpact: EventStormingNode[],
    totalReach: number
  } {
    if (!this.graph.hasNode(nodeId)) {
      return { directImpact: [], indirectImpact: [], totalReach: 0 };
    }

    const directImpact: EventStormingNode[] = [];
    const allReachable = new Set<string>();
    const visited = new Set<string>();

    // Get direct neighbors
    this.graph.forEachOutNeighbor(nodeId, (neighbor) => {
      const node = this.graph.getNodeAttributes(neighbor) as EventStormingNode;
      directImpact.push(node);
      allReachable.add(neighbor);
    });

    // BFS to find all reachable nodes
    const queue: string[] = [];
    this.graph.forEachOutNeighbor(nodeId, (neighbor) => {
      queue.push(neighbor);
    });
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      
      visited.add(current);
      allReachable.add(current);

      this.graph.forEachOutNeighbor(current, (neighbor) => {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      });
    }

    const indirectImpact: EventStormingNode[] = [];
    allReachable.forEach((reachableId) => {
      if (!directImpact.some(n => n.id === reachableId)) {
        const node = this.graph.getNodeAttributes(reachableId) as EventStormingNode;
        indirectImpact.push(node);
      }
    });

    return {
      directImpact,
      indirectImpact,
      totalReach: allReachable.size
    };
  }

  /**
   * Find bottleneck nodes (high centrality)
   */
  findBottlenecks(): Array<{ node: EventStormingNode, centrality: number }> {
    const bottlenecks: Array<{ node: EventStormingNode, centrality: number }> = [];

    this.graph.forEachNode((nodeId, attributes) => {
      const node = attributes as EventStormingNode;
      const inDegree = this.graph.inDegree(nodeId);
      const outDegree = this.graph.outDegree(nodeId);
      const centrality = inDegree + outDegree;

      if (centrality > 0) {
        bottlenecks.push({ node, centrality });
      }
    });

    return bottlenecks.sort((a, b) => b.centrality - a.centrality);
  }

  /**
   * Find all paths between two nodes
   */
  findAllPaths(sourceId: string, targetId: string, maxLength: number = 10): string[][] {
    if (!this.graph.hasNode(sourceId) || !this.graph.hasNode(targetId)) {
      return [];
    }

    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (currentId: string, path: string[]) => {
      if (path.length > maxLength) return;
      if (currentId === targetId) {
        paths.push([...path, currentId]);
        return;
      }
      if (visited.has(currentId)) return;

      visited.add(currentId);
      this.graph.forEachOutNeighbor(currentId, (neighbor) => {
        dfs(neighbor, [...path, currentId]);
      });
      visited.delete(currentId);
    };

    dfs(sourceId, []);
    return paths;
  }

  /**
   * Validate EventStorming methodology rules
   */
  validateEventStormingRules(): {
    isValid: boolean,
    violations: string[],
    warnings: string[]
  } {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check commands have events
    this.graph.forEachNode((nodeId, attributes) => {
      const node = attributes as EventStormingNode;
      if (node.type === 'command') {
        const hasEvents = this.getOutNeighborsByLabel(nodeId, 'then').length > 0;
        if (!hasEvents) {
          violations.push(`Command "${node.label}" must generate at least one event`);
        }
      }
    });

    // Check events have sources
    this.graph.forEachNode((nodeId, attributes) => {
      const node = attributes as EventStormingNode;
      if (node.type === 'event') {
        const hasCommand = this.getInNeighborsByLabel(nodeId, 'then').length > 0;
        if (!hasCommand) {
          warnings.push(`Event "${node.label}" is not generated by any command`);
        }
      }
    });

    return {
      isValid: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Get advanced graph metrics
   */
  getAdvancedMetrics(): {
    nodeCount: number,
    edgeCount: number,
    density: number,
    connectedComponents: number,
    cycles: number,
    avgDegree: number,
    bottlenecks: Array<{ node: EventStormingNode, centrality: number }>
  } {
    const nodeCount = this.graph.order;
    const edgeCount = this.graph.size;
    const maxEdges = nodeCount * (nodeCount - 1);
    const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

    // Count connected components (simplified)
    const visited = new Set<string>();
    let connectedComponents = 0;

    this.graph.forEachNode((nodeId) => {
      if (!visited.has(nodeId)) {
        connectedComponents++;
        // BFS to mark all connected nodes
        const queue = [nodeId];
        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;
          visited.add(current);
          
          this.graph.forEachNeighbor(current, (neighbor) => {
            if (!visited.has(neighbor)) {
              queue.push(neighbor);
            }
          });
        }
      }
    });

    const cycles = this.detectCycles().length;
    const avgDegree = nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0;
    const bottlenecks = this.findBottlenecks();

    return {
      nodeCount,
      edgeCount,
      density,
      connectedComponents,
      cycles,
      avgDegree,
      bottlenecks
    };
  }
}