/**
 * Vite plugin to bridge between web UI and terminal AI assistants
 * This creates a WebSocket connection for real-time communication
 * Currently supports Claude, can be extended for other AI CLIs
 */

import * as ws from 'ws';
import { spawn, exec, ChildProcess } from 'child_process';
import path from 'path';

interface AIConfig {
  command: string;
  type: string;
  method: 'interactive' | 'pipe';
  workingDirectory: string;
  jsonFilePath?: string;
  process: ChildProcess | null;
}

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

export function aiBridgePlugin() {
  let wss: ws.WebSocketServer;
  let aiProcesses = new Map<string, AIConfig>(); // Support multiple AI processes
  let clients = new Set<ws.WebSocket>();

  return {
    name: 'ai-bridge',
    
    configureServer(server: any) {
      // Create WebSocket server
      wss = new ws.WebSocketServer({ port: 3003 });
      console.log('🌉 AI Bridge WebSocket server running on port 3003');

      wss.on('connection', (websocket: ws.WebSocket) => {
        console.log('✅ New client connected to AI Bridge');
        clients.add(websocket);
        
        // Send initial connection success
        websocket.send(JSON.stringify({
          type: 'info',
          message: 'Connected to AI Bridge. Messages will be logged to console for manual relay to Claude.'
        }));

        websocket.on('message', (message: ws.Data) => {
          try {
            const data = JSON.parse(message.toString());
            
            if (data.type === 'ai-message') {
              const aiType = data.ai || 'claude';
              
              // Check if AI is "running" (registered)
              if (!aiProcesses.has(aiType)) {
                websocket.send(JSON.stringify({
                  type: 'error',
                  message: `${aiType} not started. Click "Start" to begin.`
                }));
                return;
              }
              
              // Send message using the appropriate method
              sendMessageToAI(aiType, data.message, websocket);
            } else if (data.type === 'start-ai') {
              // Start AI process with optional JSON file path for working directory
              startAIProcess(websocket, data.ai || 'gemini', data.jsonFilePath);
            } else if (data.type === 'stop-ai') {
              // Stop AI process
              stopAIProcess(websocket, data.ai || 'gemini');
            } else if (data.type === 'ping') {
              websocket.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (error) {
            console.error('Error processing message:', error);
            websocket.send(JSON.stringify({
              type: 'error',
              message: (error as Error).message
            }));
          }
        });

        websocket.on('close', () => {
          console.log('❌ Client disconnected from AI Bridge');
          clients.delete(websocket);
        });

        websocket.on('error', (error: Error) => {
          console.error('WebSocket error:', error);
          clients.delete(websocket);
        });
      });

      // Middleware for HTTP endpoints
      server.middlewares.use(async (req: Request, res: Response, next: () => void) => {
        if (req.url === '/api/ai-bridge/status' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            status: 'running',
            websocketPort: 3003,
            aiProcessesActive: aiProcesses.size,
            connectedClients: clients.size
          }));
        } else if (req.url === '/api/ai-bridge/inject-response' && req.method === 'POST') {
          // Endpoint to inject AI responses manually
          let body = '';
          
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', () => {
            try {
              const { response } = JSON.parse(body);
              
              // Broadcast response to all connected clients
              for (const client of clients) {
                if (client.readyState === 1) {
                  client.send(JSON.stringify({
                    type: 'ai-response',
                    ai: 'claude',
                    message: response
                  }));
                }
              }
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                message: 'Response sent to all clients' 
              }));
            } catch (error) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: (error as Error).message }));
            }
          });
        } else {
          next();
        }
      });
    },

    closeBundle() {
      // Cleanup on server close
      if (wss) {
        wss.close();
      }
      // Kill all AI processes
      for (const [aiType, aiConfig] of aiProcesses) {
        console.log(`Killing ${aiType} process...`);
        if (aiConfig.process) {
          aiConfig.process.stdin?.end();
          aiConfig.process.kill('SIGTERM');
          
          // Force kill if needed
          setTimeout(() => {
            if (aiConfig.process && !aiConfig.process.killed) {
              aiConfig.process.kill('SIGKILL');
            }
          }, 2000);
        }
      }
      aiProcesses.clear();
    }
  };

  function startAIProcess(websocket: ws.WebSocket, aiType: string, jsonFilePath?: string) {
    // Determine working directory from JSON file path
    let workingDirectory = process.cwd();
    if (jsonFilePath) {
      try {
        workingDirectory = path.dirname(jsonFilePath);
        console.log(`🗂️ Setting AI working directory to: ${workingDirectory}`);
      } catch (error) {
        console.warn(`⚠️ Failed to extract directory from ${jsonFilePath}, using current directory`);
      }
    }
    
    if (aiProcesses.has(aiType)) {
      websocket.send(JSON.stringify({
        type: 'info',
        message: `${aiType} already started`
      }));
      return;
    }

    try {
      // Map AI type to command approach
      const aiConfigs: Record<string, { command: string; method: 'interactive' | 'pipe' }> = {
        'claude': { command: 'claude', method: 'interactive' }, // Interactive session
        'gemini': { command: 'gemini', method: 'pipe' }, // Pipe method
      };

      const aiConfig = aiConfigs[aiType];
      if (!aiConfig) {
        throw new Error(`Unknown AI type: ${aiType}`);
      }
      
      const { command, method } = aiConfig;

      console.log(`Registering ${aiType} with command: ${command}, method: ${method} in directory: ${workingDirectory}`);
      
      if (method === 'interactive') {
        // Spawn persistent interactive process for Claude
        console.log(`🚀 Spawning interactive ${aiType} process with command: ${command}`);
        const childProcess = spawn(command, [], {
          cwd: workingDirectory,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env
        });
        
        console.log(`📋 ${aiType} process PID:`, childProcess.pid);
      
      // Setup process event handlers
      childProcess.on('error', (error: Error) => {
        console.error(`${aiType} process error:`, error);
        websocket.send(JSON.stringify({
          type: 'error',
          message: `${aiType} process error: ${error.message}`
        }));
      });
      
      childProcess.on('exit', (code: number | null) => {
        console.log(`${aiType} process exited with code ${code}`);
        aiProcesses.delete(aiType);
        
        // Notify all clients
        for (const client of clients) {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'ai-closed',
              ai: aiType,
              code
            }));
          }
        }
      });
      
      // Handle stdout data
      childProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(`${aiType} stdout raw:`, JSON.stringify(output));
        console.log(`${aiType} stdout length:`, output.length);
        
        // Only send non-empty, meaningful output
        const trimmedOutput = output.trim();
        if (trimmedOutput.length > 0) {
          console.log(`${aiType} sending output:`, trimmedOutput);
          
          // Broadcast response to all connected clients
          for (const client of clients) {
            if (client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'ai-response',
                ai: aiType,
                message: trimmedOutput
              }));
            }
          }
        }
      });
      
      // Handle stderr data
      childProcess.stderr?.on('data', (data: Buffer) => {
        const error = data.toString();
        console.log(`${aiType} stderr:`, error);
        
        // Send error to clients
        for (const client of clients) {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'ai-error',
              ai: aiType,
              message: error.trim()
            }));
          }
        }
      });
      
        aiProcesses.set(aiType, { 
          command, 
          type: aiType,
          method: 'interactive',
          workingDirectory,
          jsonFilePath,
          process: childProcess
        });
      } else if (method === 'pipe') {
        // For pipe method (Gemini), just register the config without spawning a persistent process
        aiProcesses.set(aiType, { 
          command, 
          type: aiType,
          method: 'pipe',
          workingDirectory,
          jsonFilePath,
          process: null
        });
        
        console.log(`📝 Registered ${aiType} for pipe method`);
      }

      websocket.send(JSON.stringify({
        type: 'ai-started',
        ai: aiType,
        message: `${aiType} ready for messages in ${workingDirectory}`
      }));

    } catch (error) {
      console.error(`Failed to start ${aiType}:`, error);
      websocket.send(JSON.stringify({
        type: 'error',
        message: `Failed to start ${aiType}: ${(error as Error).message}`
      }));
    }
  }

  function sendMessageToAI(aiType: string, message: string, websocket: ws.WebSocket) {
    const aiConfig = aiProcesses.get(aiType);
    if (!aiConfig) return;

    console.log(`📤 Sending to ${aiType}:`, message);

    if (aiConfig.method === 'interactive' && aiConfig.process) {
      // Send message to persistent interactive process (Claude)
      try {
        console.log(`🔍 ${aiType} process status - PID: ${aiConfig.process.pid}, killed: ${aiConfig.process.killed}, exitCode: ${aiConfig.process.exitCode}`);
        
        const messageWithNewline = message + '\n';
        console.log(`📤 Writing to ${aiType} stdin:`, JSON.stringify(messageWithNewline));
        aiConfig.process.stdin?.write(messageWithNewline);
        console.log(`🤖 Sent message to persistent ${aiType} process`);
      } catch (error) {
        console.error(`Failed to send message to ${aiType}:`, error);
        for (const client of clients) {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'ai-error',
              ai: aiType,
              message: `Failed to send message: ${(error as Error).message}`
            }));
          }
        }
      }
    } else if (aiConfig.method === 'pipe') {
      // Use pipe method for Gemini - spawn new process for each message
      try {
        console.log(`🚀 Spawning new ${aiType} process for message`);
        const childProcess = spawn(aiConfig.command, ['-p', message], {
          cwd: aiConfig.workingDirectory,
          stdio: ['inherit', 'pipe', 'pipe'],
          env: process.env
        });
        
        let output = '';
        let errorOutput = '';
        
        childProcess.stdout?.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        childProcess.stderr?.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });
        
        childProcess.on('close', (code: number | null) => {
          console.log(`${aiType} process exited with code ${code}`);
          
          if (code === 0 && output.trim()) {
            console.log(`${aiType} pipe output:`, output.trim());
            
            // Filter out MCP server messages and other system info
            let cleanedOutput = output.trim();
            
            // Remove MCP server connection messages
            cleanedOutput = cleanedOutput.replace(/^No tools registered from MCP server '[^']+'. Closing connection.\s*/gm, '');
            
            // Remove any other system messages (add more patterns as needed)
            cleanedOutput = cleanedOutput.replace(/^\(node:\d+\).*DeprecationWarning.*\n?/gm, '');
            
            // Clean up any extra whitespace
            cleanedOutput = cleanedOutput.trim();
            
            if (cleanedOutput) {
              // Broadcast response to all connected clients
              for (const client of clients) {
                if (client.readyState === 1) {
                  client.send(JSON.stringify({
                    type: 'ai-response',
                    ai: aiType,
                    message: cleanedOutput
                  }));
                }
              }
            }
          } else {
            console.error(`${aiType} pipe error or no output:`, errorOutput || 'No output received');
            
            for (const client of clients) {
              if (client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'ai-error',
                  ai: aiType,
                  message: errorOutput || 'No response received'
                }));
              }
            }
          }
        });
        
        childProcess.on('error', (error: Error) => {
          console.error(`${aiType} pipe process error:`, error);
          for (const client of clients) {
            if (client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'ai-error',
                ai: aiType,
                message: `Process error: ${error.message}`
              }));
            }
          }
        });
        
      } catch (error) {
        console.error(`Failed to spawn ${aiType} pipe process:`, error);
        for (const client of clients) {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'ai-error',
              ai: aiType,
              message: `Failed to spawn process: ${(error as Error).message}`
            }));
          }
        }
      }
    } else {
      // Fallback: process not available
      console.error(`${aiType} process not available or unknown method: ${aiConfig.method}`);
      for (const client of clients) {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'ai-error',
            ai: aiType,
            message: `${aiType} process not available. Try restarting the AI.`
          }));
        }
      }
    }
  }

  function stopAIProcess(websocket: ws.WebSocket, aiType: string) {
    const aiConfig = aiProcesses.get(aiType);
    
    if (!aiConfig) {
      websocket.send(JSON.stringify({
        type: 'info',
        message: `${aiType} not running`
      }));
      return;
    }

    try {
      console.log(`Stopping ${aiType}...`);
      
      if (aiConfig.process) {
        // Gracefully terminate the persistent process
        aiConfig.process.stdin?.end();
        aiConfig.process.kill('SIGTERM');
        
        // Force kill if it doesn't terminate gracefully
        setTimeout(() => {
          if (aiConfig.process && !aiConfig.process.killed) {
            aiConfig.process.kill('SIGKILL');
          }
        }, 5000);
      }
      
      aiProcesses.delete(aiType);
      
      websocket.send(JSON.stringify({
        type: 'ai-closed',
        ai: aiType,
        code: 0
      }));
      
    } catch (error) {
      console.error(`Failed to stop ${aiType}:`, error);
      websocket.send(JSON.stringify({
        type: 'error',
        message: `Failed to stop ${aiType}: ${(error as Error).message}`
      }));
    }
  }
}