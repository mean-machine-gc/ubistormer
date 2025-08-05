/**
 * EventStorming WebSocket Client
 * Connects to the EventStorming bridge and executes operations on the in-memory graph
 */

import { get } from 'svelte/store';
import { graphOperations, analysisOperations, apiStore } from '../stores/index.ts';
import type { EventStormingNode, EventStormingEdge } from '../eventstorming-api.js';

class EventStormingClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket('ws://localhost:3004');
      
      this.ws.onopen = () => {
        console.log('🎯 EventStorming Bridge connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse EventStorming message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('❌ EventStorming Bridge disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('EventStorming WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect to EventStorming Bridge:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect to EventStorming Bridge (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached for EventStorming Bridge');
    }
  }

  private handleMessage(message: any) {
    console.log('📨 EventStorming operation received:', message.type);

    try {
      switch (message.type) {
        case 'connected':
          console.log('✅ EventStorming Bridge connection confirmed');
          break;

        case 'get-graph':
          this.handleGetGraph(message);
          break;

        case 'add-node':
          this.handleAddNode(message);
          break;

        case 'update-node':
          this.handleUpdateNode(message);
          break;

        case 'delete-node':
          this.handleDeleteNode(message);
          break;

        case 'add-edge':
          this.handleAddEdge(message);
          break;

        case 'create-command-flow':
          this.handleCreateCommandFlow(message);
          break;

        case 'validate-graph':
          this.handleValidateGraph(message);
          break;

        case 'get-statistics':
          this.handleGetStatistics(message);
          break;

        case 'get-health':
          this.handleGetHealth(message);
          break;

        case 'get-process-flow':
          this.handleGetProcessFlow(message);
          break;

        case 'get-aggregate-view':
          this.handleGetAggregateView(message);
          break;

        case 'get-system-overview':
          this.handleGetSystemOverview(message);
          break;

        case 'suggest-improvements':
          this.handleSuggestImprovements(message);
          break;

        case 'explain-node-context':
          this.handleExplainNodeContext(message);
          break;

        case 'get-nodes-by-type':
          this.handleGetNodesByType(message);
          break;

        case 'find-critical-nodes':
          this.handleFindCriticalNodes(message);
          break;

        case 'detect-circular-dependencies':
          this.handleDetectCircularDependencies(message);
          break;

        case 'get-change-impact':
          this.handleGetChangeImpact(message);
          break;

        case 'validate-methodology':
          this.handleValidateMethodology(message);
          break;

        case 'get-command-execution-paths':
          this.handleGetCommandExecutionPaths(message);
          break;

        case 'analyze-aggregate-health':
          this.handleAnalyzeAggregateHealth(message);
          break;

        case 'get-all-process-flows':
          this.handleGetAllProcessFlows(message);
          break;

        case 'get-all-aggregate-views':
          this.handleGetAllAggregateViews(message);
          break;

        case 'get-processes-by-event':
          this.handleGetProcessesByEvent(message);
          break;

        case 'get-aggregates-by-actor':
          this.handleGetAggregatesByActor(message);
          break;

        default:
          console.warn('Unknown EventStorming operation:', message.type);
      }
    } catch (error) {
      console.error('Error handling EventStorming operation:', error);
      this.sendResponse(message.requestId, {
        success: false,
        error: (error as Error).message
      });
    }
  }

  private sendResponse(requestId: number, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'response',
        requestId,
        data
      }));
    }
  }

  private handleGetGraph(message: any) {
    const api = get(apiStore);
    const graphData = api.getGraph();
    
    this.sendResponse(message.requestId, {
      success: true,
      data: graphData
    });
  }

  private handleAddNode(message: any) {
    const nodeData = message.data as Partial<EventStormingNode>;
    const result = graphOperations.addNode(nodeData);
    
    this.sendResponse(message.requestId, {
      success: result.success,
      data: result.success ? result.node : null,
      error: result.success ? null : result.result.errors,
      warnings: result.success ? result.result.warnings : null
    });
  }

  private handleUpdateNode(message: any) {
    const { nodeId, data } = message;
    const result = graphOperations.updateNode(nodeId, data);
    
    this.sendResponse(message.requestId, {
      success: result.success,
      error: result.success ? null : result.result.errors,
      warnings: result.success ? result.result.warnings : null
    });
  }

  private handleDeleteNode(message: any) {
    const { nodeId } = message;
    const result = graphOperations.deleteNode(nodeId);
    
    this.sendResponse(message.requestId, {
      success: result.success,
      error: result.success ? null : result.result.errors,
      impact: result.impact
    });
  }

  private handleAddEdge(message: any) {
    const edgeData = message.data as EventStormingEdge;
    const result = graphOperations.addEdge(edgeData);
    
    this.sendResponse(message.requestId, {
      success: result.success,
      error: result.success ? null : result.result.errors,
      warnings: result.success ? result.result.warnings : null
    });
  }

  private handleCreateCommandFlow(message: any) {
    const flowData = message.data;
    const result = graphOperations.createCommandFlow(flowData);
    
    this.sendResponse(message.requestId, {
      success: result.success,
      error: result.success ? null : result.result.errors,
      warnings: result.success ? result.result.warnings : null
    });
  }

  private handleValidateGraph(message: any) {
    const api = get(apiStore);
    const validation = api.validateGraph();
    
    this.sendResponse(message.requestId, {
      success: true,
      data: validation
    });
  }

  private handleGetStatistics(message: any) {
    const api = get(apiStore);
    const stats = api.getStatistics();
    
    this.sendResponse(message.requestId, {
      success: true,
      data: stats
    });
  }

  private handleGetHealth(message: any) {
    const api = get(apiStore);
    const health = api.getGraphHealthMetrics();
    
    this.sendResponse(message.requestId, {
      success: true,
      data: health
    });
  }

  private handleGetProcessFlow(message: any) {
    const { commandId } = message;
    const processFlow = analysisOperations.getProcessFlow(commandId);
    
    this.sendResponse(message.requestId, {
      success: true,
      data: processFlow
    });
  }

  private handleGetAggregateView(message: any) {
    const { aggregateId } = message;
    const aggregateView = analysisOperations.getAggregateView(aggregateId);
    
    this.sendResponse(message.requestId, {
      success: true,
      data: aggregateView
    });
  }

  private handleGetSystemOverview(message: any) {
    const api = get(apiStore);
    const [
      graph,
      health,
      critical,
      cycles,
      validation
    ] = [
      api.getGraph(),
      api.getGraphHealthMetrics(),
      api.findCriticalNodes(),
      api.detectCircularDependencies(), 
      api.validateEventStormingMethodology()
    ];

    const overview = {
      summary: {
        totalNodes: graph.nodes.length,
        totalEdges: graph.edges.length,
        nodesByType: graph.nodes.reduce((acc: any, node) => {
          acc[node.type] = (acc[node.type] || 0) + 1;
          return acc;
        }, {}),
        healthScore: health.methodology.validationScore,
        criticalIssues: validation.violations.length,
        warnings: validation.warnings.length
      },
      healthMetrics: health,
      criticalNodes: critical.slice(0, 5), // Top 5 most critical
      circularDependencies: cycles,
      validationResults: validation
    };

    this.sendResponse(message.requestId, {
      success: true,
      data: overview
    });
  }

  private handleSuggestImprovements(message: any) {
    const api = get(apiStore);
    const [validation, health, critical] = [
      api.validateEventStormingMethodology(),
      api.getGraphHealthMetrics(),
      api.findCriticalNodes()
    ];

    const suggestions: any[] = [];

    // Add suggestions based on validation violations
    validation.violations.forEach((violation: any) => {
      if (violation.message && violation.message.includes("doesn't operate on any aggregate")) {
        suggestions.push({
          type: "structural",
          priority: "high",
          issue: violation.message,
          suggestion: "Add an edge from this command to an aggregate using the 'on' relationship"
        });
      }
      if (violation.message && violation.message.includes("Circular dependency")) {
        suggestions.push({
          type: "architectural",
          priority: "critical", 
          issue: violation.message,
          suggestion: "Break the circular dependency by reviewing the business logic flow"
        });
      }
    });

    // Add suggestions based on health metrics
    if (health.methodology.validationScore < 0.7) {
      suggestions.push({
        type: "health",
        priority: "medium",
        issue: `Overall health score is ${health.methodology.validationScore.toFixed(2)}`,
        suggestion: "Consider simplifying complex aggregates or improving connectivity"
      });
    }

    // Add suggestions for critical nodes
    critical.slice(0, 3).forEach((node: any) => {
      if (node.criticalityLevel === 'HIGH') {
        suggestions.push({
          type: "architecture",
          priority: "medium",
          issue: `Node "${node.node.label}" has high criticality (${node.centrality})`,
          suggestion: "Consider breaking down this highly connected node or adding redundant paths"
        });
      }
    });

    this.sendResponse(message.requestId, {
      success: true,
      data: {
        totalSuggestions: suggestions.length,
        suggestions: suggestions
      }
    });
  }

  private handleExplainNodeContext(message: any) {
    const { nodeId } = message;
    const api = get(apiStore);
    const node = api.getNode(nodeId);
    
    if (!node) {
      this.sendResponse(message.requestId, {
        success: false,
        error: `Node '${nodeId}' not found`
      });
      return;
    }

    const [edges, impact] = [
      api.getNodeEdges(nodeId),
      api.getChangeImpactAnalysis(nodeId)
    ];

    // Get connected nodes with relationship context
    const connections = edges.map((edge: any) => {
      const isOutgoing = edge.source === nodeId;
      const connectedNodeId = isOutgoing ? edge.target : edge.source;
      const connectedNode = api.getNode(connectedNodeId);
      
      return {
        relationship: edge.label,
        direction: isOutgoing ? 'outgoing' : 'incoming',
        connectedNode: connectedNode ? {
          id: connectedNode.id,
          label: connectedNode.label,
          type: connectedNode.type
        } : null
      };
    });

    const context = {
      node: {
        id: node.id,
        label: node.label,
        type: node.type,
        description: node.description,
        businessContext: node.businessContext
      },
      role: this.getNodeRoleDescription(node.type),
      connections: connections,
      impact: {
        directlyAffected: impact.directImpact.length,
        totalReach: impact.totalReach,
        criticalityAssessment: impact.totalReach > 5 ? 'high' : impact.totalReach > 2 ? 'medium' : 'low'
      }
    };

    this.sendResponse(message.requestId, {
      success: true,
      data: context
    });
  }

  private handleGetNodesByType(message: any) {
    const { nodeType } = message;
    const api = get(apiStore);
    const nodes = api.getNodesByType(nodeType);
    
    this.sendResponse(message.requestId, {
      success: true,
      data: nodes
    });
  }

  private handleFindCriticalNodes(message: any) {
    const api = get(apiStore);
    const criticalNodes = api.findCriticalNodes();
    
    this.sendResponse(message.requestId, {
      success: true,
      data: criticalNodes
    });
  }

  private handleDetectCircularDependencies(message: any) {
    const api = get(apiStore);
    const cycles = api.detectCircularDependencies();
    
    this.sendResponse(message.requestId, {
      success: true,
      data: cycles
    });
  }

  private handleGetChangeImpact(message: any) {
    const { nodeId } = message;
    const api = get(apiStore);
    const impact = api.getChangeImpactAnalysis(nodeId);
    
    this.sendResponse(message.requestId, {
      success: true,
      data: impact
    });
  }

  private handleValidateMethodology(message: any) {
    const api = get(apiStore);
    const validation = api.validateEventStormingMethodology();
    
    this.sendResponse(message.requestId, {
      success: true,
      data: validation
    });
  }

  private handleGetCommandExecutionPaths(message: any) {
    const { commandId } = message;
    const api = get(apiStore);
    const paths = api.getCommandExecutionPaths(commandId);
    
    this.sendResponse(message.requestId, {
      success: true,
      data: paths
    });
  }

  private handleAnalyzeAggregateHealth(message: any) {
    const { aggregateId } = message;
    const api = get(apiStore);
    const health = api.analyzeAggregateHealth(aggregateId);
    
    this.sendResponse(message.requestId, {
      success: true,
      data: health
    });
  }

  private handleGetAllProcessFlows(message: any) {
    const api = get(apiStore);
    const allFlows = api.getAllProcessFlows();
    
    this.sendResponse(message.requestId, {
      success: true,
      data: allFlows
    });
  }

  private handleGetAllAggregateViews(message: any) {
    const api = get(apiStore);
    const allViews = api.getAllAggregateViews();
    
    this.sendResponse(message.requestId, {
      success: true,
      data: allViews
    });
  }

  private handleGetProcessesByEvent(message: any) {
    const { eventId } = message;
    const api = get(apiStore);
    const processes = api.getProcessesByEvent(eventId);
    
    this.sendResponse(message.requestId, {
      success: true,
      data: processes
    });
  }

  private handleGetAggregatesByActor(message: any) {
    const { actorId } = message;
    const api = get(apiStore);
    const aggregates = api.getAggregatesByActor(actorId);
    
    this.sendResponse(message.requestId, {
      success: true,
      data: aggregates
    });
  }

  private getNodeRoleDescription(nodeType: string): string {
    const descriptions: { [key: string]: string } = {
      'actor': 'A person, role, or system that initiates commands in the business process',
      'command': 'An action or intention that changes the state of the system',
      'aggregate': 'A business entity that maintains state and enforces business rules',
      'event': 'A fact that occurred in the system, typically as a result of executing a command',
      'viewmodel': 'A read model that provides information needed for decision making',
      'preconditions': 'Conditions that must be true for a command to execute successfully',
      'guards': 'Business rules that determine whether a command should be allowed to execute',
      'branchinglogic': 'Conditional logic that determines whether a specific event emits'
    };
    return descriptions[nodeType] || 'Unknown node type';
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Create singleton instance
export const eventStormingClient = new EventStormingClient();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    eventStormingClient.disconnect();
  });
}