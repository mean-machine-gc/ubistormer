/**
 * MCP Tools for EventStorming API
 * Model Context Protocol tool definitions for Ubistormer EventStorming functionality
 */

import { z } from 'zod';
import { EventStormingAPI, NodeType, EdgeLabel } from './eventstorming-api.js';

// Initialize the EventStorming API instance
const api = new EventStormingAPI();

// Load the graph from ubistorming.json on startup
api.loadFromFile().catch(console.error);

// Define schemas for common types
const NodeTypeSchema = z.enum(['actor', 'command', 'aggregate', 'event', 'viewmodel', 'preconditions', 'guards', 'branchinglogic']);
const EdgeLabelSchema = z.enum(['issues', 'on', 'then', 'if', 'if guard', 'if preconditions', 'then (policy)', 'supports decision for']);

// Helper function to describe node roles
function getNodeRoleDescription(nodeType: NodeType): string {
  const descriptions = {
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

export function registerEventStormingTools(server: any) {
  // ==================== QUERY & ANALYSIS TOOLS ====================

  server.addTool({
    name: "eventstorming_get_graph",
    description: "Get the complete EventStorming graph data",
    parameters: z.object({}),
    execute: async () => {
      const graph = api.getGraph();
      return JSON.stringify(graph, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_get_nodes_by_type",
    description: "Get all nodes of a specific type",
    parameters: z.object({
      type: NodeTypeSchema.describe("Type of nodes to retrieve"),
    }),
    execute: async (args: any) => {
      const nodes = api.getNodesByType(args.type as NodeType);
      return JSON.stringify(nodes, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_get_process_flow",
    description: `Get complete process flow for a command showing the full business process:
    Actor → Command → Aggregate → Events → Branching Logic
    
    Returns the command's actor, target aggregate, guards/preconditions, resulting events, 
    and any branching logic. Essential for understanding how a business operation flows 
    through the system.`,
    parameters: z.object({
      commandId: z.string().describe("ID of the command to analyze"),
    }),
    execute: async (args: any) => {
      const flow = api.getProcessFlow(args.commandId);
      if (!flow) {
        return `Command '${args.commandId}' not found or is not a command node`;
      }
      return JSON.stringify(flow, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_get_aggregate_view",
    description: `Get all processes and commands for a specific aggregate (business entity).
    
    Shows which commands operate on this aggregate, what processes it participates in,
    all events it produces, and view models that depend on it. Use this to understand
    the complete lifecycle and responsibilities of a business entity.`,
    parameters: z.object({
      aggregateId: z.string().describe("ID of the aggregate to analyze"),
    }),
    execute: async (args: any) => {
      const view = api.getAggregateView(args.aggregateId);
      if (!view) {
        return `Aggregate '${args.aggregateId}' not found or is not an aggregate node`;
      }
      return JSON.stringify(view, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_validate_graph",
    description: "Validate the graph according to EventStorming methodology rules",
    parameters: z.object({}),
    execute: async () => {
      const validation = api.validateGraph();
      return JSON.stringify(validation, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_get_statistics",
    description: "Get statistics about the EventStorming graph",
    parameters: z.object({}),
    execute: async () => {
      const stats = api.getStatistics();
      return JSON.stringify(stats, null, 2);
    },
  });

  // ==================== ADVANCED ANALYSIS TOOLS ====================

  server.addTool({
    name: "eventstorming_get_processes_by_event",
    description: "Find all processes that produce or consume a specific event",
    parameters: z.object({
      eventId: z.string().describe("ID of the event to analyze"),
    }),
    execute: async (args: any) => {
      const processes = api.getProcessesByEvent(args.eventId);
      return JSON.stringify(processes, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_get_aggregates_by_actor",
    description: "Find all aggregates that an actor interacts with",
    parameters: z.object({
      actorId: z.string().describe("ID of the actor to analyze"),
    }),
    execute: async (args: any) => {
      const aggregates = api.getAggregatesByActor(args.actorId);
      return JSON.stringify(aggregates, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_get_all_process_flows",
    description: "Get all process flows in the system for comprehensive analysis",
    parameters: z.object({}),
    execute: async () => {
      const flows = api.getAllProcessFlows();
      return JSON.stringify(flows, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_get_all_aggregate_views",
    description: "Get all aggregate views in the system for comprehensive analysis",
    parameters: z.object({}),
    execute: async () => {
      const views = api.getAllAggregateViews();
      return JSON.stringify(views, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_detect_circular_dependencies",
    description: "Detect circular dependencies in the EventStorming graph",
    parameters: z.object({}),
    execute: async () => {
      const analysis = api.detectCircularDependencies();
      return JSON.stringify(analysis, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_get_change_impact_analysis",
    description: "Analyze the impact of changing a specific node on the rest of the system",
    parameters: z.object({
      nodeId: z.string().describe("ID of the node to analyze impact for"),
    }),
    execute: async (args: any) => {
      const impact = api.getChangeImpactAnalysis(args.nodeId);
      return JSON.stringify(impact, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_find_critical_nodes",
    description: "Find nodes that are critical to the system (high centrality/connectivity)",
    parameters: z.object({}),
    execute: async () => {
      const criticalNodes = api.findCriticalNodes();
      return JSON.stringify(criticalNodes, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_validate_methodology",
    description: "Comprehensive validation against EventStorming methodology rules",
    parameters: z.object({}),
    execute: async () => {
      const validation = api.validateEventStormingMethodology();
      return JSON.stringify(validation, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_get_command_execution_paths",
    description: "Get all possible execution paths for a command including branching logic",
    parameters: z.object({
      commandId: z.string().describe("ID of the command to analyze execution paths for"),
    }),
    execute: async (args: any) => {
      const paths = api.getCommandExecutionPaths(args.commandId);
      return JSON.stringify(paths, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_analyze_aggregate_health",
    description: "Analyze the health and complexity of a specific aggregate",
    parameters: z.object({
      aggregateId: z.string().describe("ID of the aggregate to analyze"),
    }),
    execute: async (args: any) => {
      const health = api.analyzeAggregateHealth(args.aggregateId);
      return JSON.stringify(health, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_get_graph_health_metrics",
    description: "Get comprehensive health metrics for the entire EventStorming graph",
    parameters: z.object({}),
    execute: async () => {
      const metrics = api.getGraphHealthMetrics();
      return JSON.stringify(metrics, null, 2);
    },
  });

  // ==================== BASIC CRUD TOOLS ====================

  server.addTool({
    name: "eventstorming_add_node",
    description: "Add a new node to the EventStorming graph",
    parameters: z.object({
      id: z.string().describe("Unique identifier for the node (kebab-case)"),
      label: z.string().describe("Human-readable label for the node"),
      type: NodeTypeSchema.describe("Type of EventStorming element"),
      description: z.string().optional().describe("Optional description of the node"),
      businessContext: z.string().optional().describe("Markdown business documentation"),
      assertion: z.string().optional().describe("Decision model assertion code"),
      coreCommand: z.string().optional().describe("Core command type definition"),
      shellCommand: z.string().optional().describe("Shell command type definition"),
      hydrationFunction: z.string().optional().describe("Hydration function code"),
      outcomeAssertions: z.string().optional().describe("Event outcome assertions"),
      exampleState: z.string().optional().describe("Example aggregate state"),
      domainModel: z.string().optional().describe("Domain model type definition"),
    }),
    execute: async (args: any) => {
      const result = api.addNode({
        id: args.id,
        label: args.label,
        type: args.type as NodeType,
        description: args.description,
        businessContext: args.businessContext,
        assertion: args.assertion,
        coreCommand: args.coreCommand,
        shellCommand: args.shellCommand,
        hydrationFunction: args.hydrationFunction,
        outcomeAssertions: args.outcomeAssertions,
        exampleState: args.exampleState,
        domainModel: args.domainModel,
      });
      
      if (result.isValid) {
        await api.saveToFile();
      }
      
      return JSON.stringify(result, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_add_edge",
    description: "Add a new connection between two nodes",
    parameters: z.object({
      source: z.string().describe("ID of the source node"),
      target: z.string().describe("ID of the target node"),
      label: EdgeLabelSchema.describe("Type of relationship between nodes"),
    }),
    execute: async (args: any) => {
      const result = api.addEdge({
        source: args.source,
        target: args.target,
        label: args.label as EdgeLabel,
      });
      
      if (result.isValid) {
        await api.saveToFile();
      }
      
      return JSON.stringify(result, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_remove_node",
    description: "Remove a node and all its connections from the graph",
    parameters: z.object({
      id: z.string().describe("ID of the node to remove"),
    }),
    execute: async (args: any) => {
      const result = api.removeNode(args.id);
      
      if (result.isValid) {
        await api.saveToFile();
      }
      
      return JSON.stringify(result, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_update_node_extended_fields",
    description: "Update a node with extended fields like businessContext, assertion, etc.",
    parameters: z.object({
      nodeId: z.string().describe("ID of the node to update"),
      businessContext: z.string().optional().describe("Markdown business documentation"),
      assertion: z.string().optional().describe("Decision model assertion code"),
      coreCommand: z.string().optional().describe("Core command type definition"),
      shellCommand: z.string().optional().describe("Shell command type definition"),
      hydrationFunction: z.string().optional().describe("Hydration function code"),
      outcomeAssertions: z.string().optional().describe("Event outcome assertions"),
      exampleState: z.string().optional().describe("Example aggregate state"),
      domainModel: z.string().optional().describe("Domain model type definition"),
    }),
    execute: async (args: any) => {
      const { nodeId, ...fields } = args;
      const result = api.updateNodeExtendedFields(nodeId, fields);
      
      if (result.isValid) {
        await api.saveToFile();
      }
      
      return JSON.stringify(result, null, 2);
    },
  });

  // ==================== HIGH-LEVEL CONSTRUCTION TOOLS ====================

  server.addTool({
    name: "eventstorming_create_command_flow",
    description: "Create a complete command flow (Actor -> Command -> Aggregate -> Event)",
    parameters: z.object({
      actorId: z.string().describe("ID for the actor node"),
      actorLabel: z.string().describe("Label for the actor"),
      commandId: z.string().describe("ID for the command node"),
      commandLabel: z.string().describe("Label for the command"),
      aggregateId: z.string().describe("ID for the aggregate node"),
      aggregateLabel: z.string().describe("Label for the aggregate"),
      eventId: z.string().describe("ID for the event node"),
      eventLabel: z.string().describe("Label for the event"),
      description: z.string().optional().describe("Optional description for all nodes"),
    }),
    execute: async (args: any) => {
      const result = api.createCommandFlow(args);
      
      if (result.isValid) {
        await api.saveToFile();
      }
      
      return JSON.stringify(result, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_add_command_guards",
    description: "Add guard conditions to a command (validation before execution)",
    parameters: z.object({
      commandId: z.string().describe("ID of the command to add guards to"),
      guards: z.array(z.object({
        id: z.string().describe("ID for the guard node"),
        label: z.string().describe("Label for the guard condition"),
        description: z.string().optional().describe("Optional description of the guard"),
      })).describe("Array of guard conditions to add"),
    }),
    execute: async (args: any) => {
      const result = api.addCommandGuards(args.commandId, args.guards);
      
      if (result.isValid) {
        await api.saveToFile();
      }
      
      return JSON.stringify(result, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_add_command_preconditions",
    description: "Add preconditions to a command (requirements for ANY success)",
    parameters: z.object({
      commandId: z.string().describe("ID of the command to add preconditions to"),
      preconditions: z.array(z.object({
        id: z.string().describe("ID for the precondition node"),
        label: z.string().describe("Label for the precondition"),
        description: z.string().optional().describe("Optional description of the precondition"),
      })).describe("Array of preconditions to add"),
    }),
    execute: async (args: any) => {
      const result = api.addCommandPreconditions(args.commandId, args.preconditions);
      
      if (result.isValid) {
        await api.saveToFile();
      }
      
      return JSON.stringify(result, null, 2);
    },
  });

  // ==================== FILE OPERATIONS ====================

  server.addTool({
    name: "eventstorming_load_from_file",
    description: "Load graph from ubistorming.json file (or custom path)",
    parameters: z.object({
      filePath: z.string().optional().describe("Path to JSON file (defaults to ubistorming.json)"),
    }),
    execute: async (args: any) => {
      const result = await api.loadFromFile(args.filePath);
      return JSON.stringify(result, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_save_to_file",
    description: "Save graph to ubistorming.json file (or custom path)",
    parameters: z.object({
      filePath: z.string().optional().describe("Path to JSON file (defaults to ubistorming.json)"),
    }),
    execute: async (args: any) => {
      const result = await api.saveToFile(args.filePath);
      return JSON.stringify(result, null, 2);
    },
  });

  // ==================== LLM-FRIENDLY HELPER TOOLS ====================

  server.addTool({
    name: "eventstorming_analyze_system_overview",
    description: `Get a comprehensive system overview combining multiple analyses:
    
    - Node/edge counts and distribution by type
    - Overall health score and critical issues count
    - Top 5 most critical/connected nodes
    - Circular dependencies detection
    - Validation results with violations/warnings
    
    Perfect starting point for system analysis or architecture health checks.`,
    parameters: z.object({}),
    execute: async () => {
      const [
        graph,
        health,
        critical,
        cycles,
        validation
      ] = await Promise.all([
        api.getGraph(),
        api.getGraphHealthMetrics(),
        api.findCriticalNodes(),
        api.detectCircularDependencies(), 
        api.validateEventStormingMethodology()
      ]);

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

      return JSON.stringify(overview, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_suggest_improvements",
    description: `Analyze the graph and suggest specific improvements based on EventStorming best practices.
    
    Provides prioritized suggestions for:
    - Structural issues (missing required connections)
    - Architectural problems (circular dependencies)
    - Health concerns (low validation scores)
    - Over-connected nodes (potential bottlenecks)
    
    Each suggestion includes issue description, priority level, and recommended action.`,
    parameters: z.object({}),
    execute: async () => {
      const [validation, health, critical] = await Promise.all([
        api.validateEventStormingMethodology(),
        api.getGraphHealthMetrics(),
        api.findCriticalNodes()
      ]);

      const suggestions = [];

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

      return JSON.stringify({
        totalSuggestions: suggestions.length,
        suggestions: suggestions
      }, null, 2);
    },
  });

  server.addTool({
    name: "eventstorming_explain_node_context", 
    description: `Get comprehensive context about any node in the system:
    
    - Node details (type, label, description, business context)
    - Role explanation (what this type of node does in EventStorming)
    - All incoming/outgoing connections with relationship types
    - Impact analysis (how many nodes would be affected by changes)
    - Criticality assessment (low/medium/high based on connectivity)
    
    Use this to understand complex nodes or explain system parts to stakeholders.`,
    parameters: z.object({
      nodeId: z.string().describe("ID of the node to explain"),
    }),
    execute: async (args: any) => {
      const node = api.getNode(args.nodeId);
      if (!node) {
        return `Node '${args.nodeId}' not found`;
      }

      const [edges, impact] = await Promise.all([
        api.getNodeEdges(args.nodeId),
        api.getChangeImpactAnalysis(args.nodeId)
      ]);

      // Get connected nodes with relationship context
      const connections = edges.map((edge: any) => {
        const isOutgoing = edge.source === args.nodeId;
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
        role: getNodeRoleDescription(node.type),
        connections: connections,
        impact: {
          directlyAffected: impact.directImpact.length,
          totalReach: impact.totalReach,
          criticalityAssessment: impact.totalReach > 5 ? 'high' : impact.totalReach > 2 ? 'medium' : 'low'
        }
      };

      return JSON.stringify(context, null, 2);
    },
  });

  // ==================== LEGACY SUPPORT ====================

  server.addTool({
    name: "eventstorming_get_command_flow",
    description: "Get complete information about a command flow (legacy method, use get_process_flow instead)",
    parameters: z.object({
      commandId: z.string().describe("ID of the command to analyze"),
    }),
    execute: async (args: any) => {
      const flow = api.getCommandFlow(args.commandId);
      if (!flow) {
        return `Command '${args.commandId}' not found or is not a command node`;
      }
      return JSON.stringify(flow, null, 2);
    },
  });
}

// Export the API instance for direct access if needed
export { api as eventStormingAPI };