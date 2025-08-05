/**
 * Vite plugin to handle save requests during development
 * Simplified version without file watching - manual saves only
 */

import fs from 'fs';
import path from 'path';
import type { EventStormingNode } from '../eventstorming-api.js';

interface Request {
  method: string;
  url: string;
  headers: Record<string, string>;
  on: (event: string, callback: (data: any) => void) => void;
}

interface Response {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (data: string) => void;
}

export function tooltipSavePlugin() {
  // Helper function to get the current JSON path from client localStorage
  function getJsonPath(req: Request): string {
    // Try to get from request headers (sent by client)
    const clientPath = req.headers['x-json-path'];
    if (clientPath) {
      return clientPath;
    }
    
    // Fallback to default path
    return path.join(process.cwd(), '../../webhook-narrative.json');
  }
  
  return {
    name: 'tooltip-save',
    async configureServer(server: any) {
      server.middlewares.use(async (req: Request, res: Response, next: () => void) => {
        if (req.url === '/api/tooltip-save/save-node' && req.method === 'POST') {
          let body = '';
          
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', async () => {
            try {
              const { nodeId, updatedFields } = JSON.parse(body);
              
              // Get dynamic path from client or use default
              const jsonPath = getJsonPath(req);
              
              // Read current data
              const narrativeData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
              
              // Find and update the node
              const nodeIndex = narrativeData.nodes.findIndex((node: EventStormingNode) => node.id === nodeId);
              if (nodeIndex === -1) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: `Node ${nodeId} not found` }));
                return;
              }
              
              // Update the node
              narrativeData.nodes[nodeIndex] = {
                ...narrativeData.nodes[nodeIndex],
                ...updatedFields
              };
              
              // Write back to file
              fs.writeFileSync(jsonPath, JSON.stringify(narrativeData, null, 2));
              
              console.log(`✅ Saved changes for node: ${nodeId} in ${jsonPath}`);
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                nodeId, 
                updatedFields,
                filePath: jsonPath
              }));
              
            } catch (error) {
              console.error('Error saving:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: (error as Error).message }));
            }
          });
        } else if (req.url === '/api/tooltip-save/test-path' && req.method === 'POST') {
          let body = '';
          
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', () => {
            try {
              const { filePath } = JSON.parse(body);
              
              // Test if file exists and is readable
              if (!fs.existsSync(filePath)) {
                res.statusCode = 404;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: 'File does not exist' 
                }));
                return;
              }
              
              // Test if file is valid JSON
              const content = fs.readFileSync(filePath, 'utf8');
              JSON.parse(content); // This will throw if invalid JSON
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                message: 'File is accessible and contains valid JSON' 
              }));
              
            } catch (error) {
              res.statusCode = 400;
              res.end(JSON.stringify({ 
                success: false, 
                error: (error as Error).message 
              }));
            }
          });
        } else if (req.url === '/api/tooltip-save/get-data' && req.method === 'GET') {
          try {
            const jsonPath = getJsonPath(req);
            const content = fs.readFileSync(jsonPath, 'utf8');
            const data = JSON.parse(content);
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              success: true, 
              data,
              filePath: jsonPath
            }));
            
          } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ 
              success: false, 
              error: (error as Error).message 
            }));
          }
        } else if (req.url === '/api/tooltip-save/save-graph' && req.method === 'POST') {
          let body = '';
          
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', async () => {
            try {
              const { data } = JSON.parse(body);
              
              // Get dynamic path from client or use default
              const jsonPath = getJsonPath(req);
              
              // Write the complete graph data to file
              fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
              
              console.log(`✅ Manual save: Graph saved to ${jsonPath}`);
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                message: 'Graph saved successfully',
                filePath: jsonPath
              }));
              
            } catch (error) {
              console.error('❌ Manual save error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: (error as Error).message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
}