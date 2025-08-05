/**
 * EventStorming Bridge Plugin for Vite
 * Creates HTTP API endpoints that MCP server can call to manipulate the in-memory graph
 * Uses WebSocket to communicate with the frontend EventStorming store
 */

import * as ws from 'ws';

interface Request {
  method: string;
  url: string;
  on: (event: string, callback: (data: any) => void) => void;
}

interface Response {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (data: string) => void;
}

export function eventStormingBridgePlugin() {
  let wss: ws.WebSocketServer;
  let clients = new Map<ws.WebSocket, { 
    socket: ws.WebSocket,
    pendingRequests: Map<number, { resolve: (value: any) => void, reject: (error: any) => void }>
  }>();

  return {
    name: 'eventstorming-bridge',
    
    configureServer(server: any) {
      // Create WebSocket server for EventStorming operations
      wss = new ws.WebSocketServer({ port: 3004 });
      console.log('🎯 EventStorming Bridge WebSocket server running on port 3004');

      wss.on('connection', (websocket: ws.WebSocket) => {
        console.log('✅ EventStorming client connected - Total clients:', clients.size + 1);
        const clientData = {
          socket: websocket,
          pendingRequests: new Map<number, { resolve: (value: any) => void, reject: (error: any) => void }>()
        };
        clients.set(websocket, clientData);
        
        websocket.send(JSON.stringify({
          type: 'connected',
          message: 'EventStorming Bridge connected'
        }));

        websocket.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'response' && message.requestId) {
              const client = clients.get(websocket);
              const pendingRequest = client?.pendingRequests.get(message.requestId);
              if (pendingRequest) {
                pendingRequest.resolve(message.data);
                client?.pendingRequests.delete(message.requestId);
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });

        websocket.on('close', () => {
          console.log('❌ EventStorming client disconnected');
          const client = clients.get(websocket);
          // Reject all pending requests
          if (client) {
            for (const [requestId, pending] of client.pendingRequests) {
              pending.reject(new Error('WebSocket connection closed'));
            }
          }
          clients.delete(websocket);
        });

        websocket.on('error', (error: Error) => {
          console.error('EventStorming WebSocket error:', error);
          clients.delete(websocket);
        });
      });

      // Helper function to send operation and wait for response
      const sendOperationAndWaitForResponse = (operation: any, timeout = 5000): Promise<any> => {
        return new Promise((resolve, reject) => {
          console.log('🚀 Sending operation:', operation.type, 'to', clients.size, 'clients');
          if (clients.size === 0) {
            console.error('🚀 No connected EventStorming clients!');
            reject(new Error('No connected EventStorming clients'));
            return;
          }

          // Get the first connected client
          const [websocket, clientData] = Array.from(clients.entries())[0];
          
          if (websocket.readyState !== 1) {
            console.error('🚀 WebSocket not ready, state:', websocket.readyState);
            reject(new Error('WebSocket not ready'));
            return;
          }

          const requestId = operation.requestId;
          
          // Set up timeout
          const timeoutId = setTimeout(() => {
            clientData.pendingRequests.delete(requestId);
            reject(new Error('Request timeout'));
          }, timeout);

          // Store the pending request
          clientData.pendingRequests.set(requestId, {
            resolve: (data) => {
              clearTimeout(timeoutId);
              resolve(data);
            },
            reject: (error) => {
              clearTimeout(timeoutId);
              reject(error);
            }
          });

          // Send the operation
          websocket.send(JSON.stringify(operation));
        });
      };

      // HTTP API endpoints for MCP server
      server.middlewares.use(async (req: Request, res: Response, next: () => void) => {
        const url = new URL(req.url!, 'http://localhost');
        const path = url.pathname;

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        // EventStorming API endpoints
        if (path.startsWith('/api/eventstorming/')) {
          res.setHeader('Content-Type', 'application/json');

          try {
            if (path === '/api/eventstorming/graph' && req.method === 'GET') {
              // Get current graph data
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-graph',
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path === '/api/eventstorming/nodes' && req.method === 'POST') {
              // Add node
              console.log('🔥 HTTP POST /api/eventstorming/nodes - Adding node');
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const nodeData = JSON.parse(body);
                  console.log('🔥 Parsed node data:', nodeData.id, nodeData.type, nodeData.label);
                  const result = await sendOperationAndWaitForResponse({
                    type: 'add-node',
                    data: nodeData,
                    requestId: Date.now()
                  });
                  console.log('🔥 Add node result:', result);
                  
                  res.end(JSON.stringify(result));
                } catch (error) {
                  console.error('🔥 Add node error:', error);
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid JSON in request body: ' + (error as Error).message }));
                }
              });

            } else if (path.match(/^\/api\/eventstorming\/nodes\/([^\/]+)$/) && req.method === 'PUT') {
              // Update node
              const nodeId = path.split('/').pop();
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const updates = JSON.parse(body);
                  const result = await sendOperationAndWaitForResponse({
                    type: 'update-node',
                    nodeId,
                    data: updates,
                    requestId: Date.now()
                  });
                  
                  res.end(JSON.stringify(result));
                } catch (error) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid JSON in request body: ' + (error as Error).message }));
                }
              });

            } else if (path.match(/^\/api\/eventstorming\/nodes\/([^\/]+)$/) && req.method === 'DELETE') {
              // Delete node
              const nodeId = path.split('/').pop();
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'delete-node',
                  nodeId,
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path === '/api/eventstorming/edges' && req.method === 'POST') {
              // Add edge
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const edgeData = JSON.parse(body);
                  const result = await sendOperationAndWaitForResponse({
                    type: 'add-edge',
                    data: edgeData,
                    requestId: Date.now()
                  });
                  
                  res.end(JSON.stringify(result));
                } catch (error) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid JSON in request body: ' + (error as Error).message }));
                }
              });

            } else if (path === '/api/eventstorming/command-flow' && req.method === 'POST') {
              // Create command flow
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const flowData = JSON.parse(body);
                  const result = await sendOperationAndWaitForResponse({
                    type: 'create-command-flow',
                    data: flowData,
                    requestId: Date.now()
                  });
                  
                  res.end(JSON.stringify(result));
                } catch (error) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid JSON in request body: ' + (error as Error).message }));
                }
              });

            } else if (path === '/api/eventstorming/validate' && req.method === 'GET') {
              // Validate graph
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'validate-graph',
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path === '/api/eventstorming/statistics' && req.method === 'GET') {
              // Get statistics
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-statistics',
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path === '/api/eventstorming/health' && req.method === 'GET') {
              // Get graph health
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-health',
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path.match(/^\/api\/eventstorming\/process-flow\/([^\/]+)$/) && req.method === 'GET') {
              // Get process flow for command
              const commandId = path.split('/').pop();
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-process-flow',
                  commandId,
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path.match(/^\/api\/eventstorming\/aggregate-view\/([^\/]+)$/) && req.method === 'GET') {
              // Get aggregate view
              const aggregateId = path.split('/').pop();
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-aggregate-view',
                  aggregateId,
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path === '/api/eventstorming/system-overview' && req.method === 'GET') {
              // System overview analysis
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-system-overview',
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path === '/api/eventstorming/suggest-improvements' && req.method === 'GET') {
              // Suggest improvements
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'suggest-improvements',
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path.match(/^\/api\/eventstorming\/node-context\/([^\/]+)$/) && req.method === 'GET') {
              // Node context explanation
              const nodeId = path.split('/').pop();
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'explain-node-context',
                  nodeId,
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path.match(/^\/api\/eventstorming\/nodes\?type=(.+)$/) && req.method === 'GET') {
              // Get nodes by type
              const typeMatch = path.match(/type=(.+)$/);
              const nodeType = typeMatch ? typeMatch[1] : '';
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-nodes-by-type',
                  nodeType,
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path === '/api/eventstorming/critical-nodes' && req.method === 'GET') {
              // Find critical nodes
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'find-critical-nodes',
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path === '/api/eventstorming/circular-dependencies' && req.method === 'GET') {
              // Detect circular dependencies
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'detect-circular-dependencies',
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path.match(/^\/api\/eventstorming\/change-impact\/([^\/]+)$/) && req.method === 'GET') {
              // Change impact analysis
              const nodeId = path.split('/').pop();
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-change-impact',
                  nodeId,
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path === '/api/eventstorming/validate-methodology' && req.method === 'GET') {
              // Validate methodology
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'validate-methodology',
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path.match(/^\/api\/eventstorming\/command-execution-paths\/([^\/]+)$/) && req.method === 'GET') {
              // Command execution paths
              const commandId = path.split('/').pop();
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-command-execution-paths',
                  commandId,
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path.match(/^\/api\/eventstorming\/aggregate-health\/([^\/]+)$/) && req.method === 'GET') {
              // Aggregate health analysis
              const aggregateId = path.split('/').pop();
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'analyze-aggregate-health',
                  aggregateId,
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path === '/api/eventstorming/all-process-flows' && req.method === 'GET') {
              // Get all process flows
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-all-process-flows',
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path === '/api/eventstorming/all-aggregate-views' && req.method === 'GET') {
              // Get all aggregate views
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-all-aggregate-views',
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path.match(/^\/api\/eventstorming\/processes-by-event\/([^\/]+)$/) && req.method === 'GET') {
              // Get processes by event
              const eventId = path.split('/').pop();
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-processes-by-event',
                  eventId,
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path.match(/^\/api\/eventstorming\/aggregates-by-actor\/([^\/]+)$/) && req.method === 'GET') {
              // Get aggregates by actor
              const actorId = path.split('/').pop();
              try {
                const result = await sendOperationAndWaitForResponse({
                  type: 'get-aggregates-by-actor',
                  actorId,
                  requestId: Date.now()
                });
                
                res.end(JSON.stringify(result));
              } catch (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: (error as Error).message 
                }));
              }

            } else if (path === '/api/eventstorming/status' && req.method === 'GET') {
              // Status endpoint
              res.end(JSON.stringify({
                status: 'running',
                websocketPort: 3004,
                connectedClients: clients.size,
                endpoints: [
                  'GET /api/eventstorming/graph',
                  'GET /api/eventstorming/nodes?type={type}',
                  'POST /api/eventstorming/nodes',
                  'PUT /api/eventstorming/nodes/{id}',
                  'DELETE /api/eventstorming/nodes/{id}',
                  'POST /api/eventstorming/edges',
                  'POST /api/eventstorming/command-flow',
                  'GET /api/eventstorming/validate',
                  'GET /api/eventstorming/validate-methodology',
                  'GET /api/eventstorming/statistics',
                  'GET /api/eventstorming/health',
                  'GET /api/eventstorming/process-flow/{commandId}',
                  'GET /api/eventstorming/aggregate-view/{aggregateId}',
                  'GET /api/eventstorming/all-process-flows',
                  'GET /api/eventstorming/all-aggregate-views',
                  'GET /api/eventstorming/processes-by-event/{eventId}',
                  'GET /api/eventstorming/aggregates-by-actor/{actorId}',
                  'GET /api/eventstorming/system-overview',
                  'GET /api/eventstorming/suggest-improvements',
                  'GET /api/eventstorming/node-context/{nodeId}',
                  'GET /api/eventstorming/critical-nodes',
                  'GET /api/eventstorming/circular-dependencies',
                  'GET /api/eventstorming/change-impact/{nodeId}',
                  'GET /api/eventstorming/command-execution-paths/{commandId}',
                  'GET /api/eventstorming/aggregate-health/{aggregateId}'
                ]
              }));

            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Endpoint not found' }));
            }

          } catch (error) {
            console.error('EventStorming API error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ 
              error: 'Internal server error',
              message: (error as Error).message 
            }));
          }
        } else {
          next();
        }
      });
    },

    closeBundle() {
      if (wss) {
        wss.close();
      }
    }
  };
}