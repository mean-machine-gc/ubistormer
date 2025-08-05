/**
 * Svelvet Manager for EventStorming Graph
 * Handles graph operations and state management for Svelvet renderer
 */

export interface SvelvetNode {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: string;
    originalNode: any;
  };
  width: number;
  height: number;
  bgColor: string;
  borderColor: string;
  borderWidth: number;
  inputs: number;
  outputs: number;
  clickable: boolean;
  draggable: boolean;
}

export interface SvelvetEdge {
  id: string;
  source: string;
  target: string;
  sourceAnchor: string;
  targetAnchor: string;
  type: string;
  animate: boolean;
  color: string;
  width: number;
  label?: string;
  labelBgColor?: string;
  labelTextColor?: string;
}

export class SvelvetManager {
  private nodes: Map<string, SvelvetNode> = new Map();
  private edges: Map<string, SvelvetEdge> = new Map();
  
  constructor() {
    console.log('🎨 SvelvetManager initialized');
  }
  
  /**
   * Update node position
   */
  updateNodePosition(nodeId: string, position: { x: number; y: number }) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.position = position;
      console.log(`📍 Updated node ${nodeId} position:`, position);
    }
  }
  
  /**
   * Get all nodes
   */
  getNodes(): SvelvetNode[] {
    return Array.from(this.nodes.values());
  }
  
  /**
   * Get all edges
   */
  getEdges(): SvelvetEdge[] {
    return Array.from(this.edges.values());
  }
  
  /**
   * Clear the graph
   */
  clear() {
    this.nodes.clear();
    this.edges.clear();
    console.log('🧹 SvelvetManager cleared');
  }
  
  /**
   * Load nodes and edges
   */
  loadGraph(nodes: SvelvetNode[], edges: SvelvetEdge[]) {
    this.clear();
    
    nodes.forEach(node => {
      this.nodes.set(node.id, node);
    });
    
    edges.forEach(edge => {
      this.edges.set(edge.id, edge);
    });
    
    console.log(`📊 Loaded ${nodes.length} nodes and ${edges.length} edges`);
  }
  
  /**
   * Add a single node
   */
  addNode(node: SvelvetNode) {
    this.nodes.set(node.id, node);
    console.log(`➕ Added node ${node.id}`);
  }
  
  /**
   * Add a single edge
   */
  addEdge(edge: SvelvetEdge) {
    this.edges.set(edge.id, edge);
    console.log(`➕ Added edge ${edge.id}`);
  }
  
  /**
   * Remove a node and its connected edges
   */
  removeNode(nodeId: string) {
    this.nodes.delete(nodeId);
    
    // Remove connected edges
    const edgesToRemove: string[] = [];
    this.edges.forEach((edge, id) => {
      if (edge.source === nodeId || edge.target === nodeId) {
        edgesToRemove.push(id);
      }
    });
    
    edgesToRemove.forEach(id => this.edges.delete(id));
    
    console.log(`➖ Removed node ${nodeId} and ${edgesToRemove.length} connected edges`);
  }
  
  /**
   * Auto-layout nodes (simple grid layout)
   */
  autoLayout() {
    const nodeArray = Array.from(this.nodes.values());
    const columns = Math.ceil(Math.sqrt(nodeArray.length));
    const spacing = { x: 200, y: 150 };
    const startPos = { x: 100, y: 100 };
    
    nodeArray.forEach((node, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      node.position = {
        x: startPos.x + col * spacing.x,
        y: startPos.y + row * spacing.y
      };
    });
    
    console.log('📐 Auto-layout complete');
  }
}

// Export singleton instance
export const svelvetManager = new SvelvetManager();