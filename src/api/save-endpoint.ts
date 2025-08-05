/**
 * Simple API endpoint for saving tooltip changes to webhook-narrative.json
 * This would need to be integrated into the server setup
 */

import fs from 'fs';
import path from 'path';
import type { EventStormingNode } from '../eventstorming-api.js';

export async function saveNodeChanges(nodeId: string, updatedFields: Partial<EventStormingNode>): Promise<{ success: boolean; nodeId: string; updatedFields: Partial<EventStormingNode> }> {
  try {
    // Path to the JSON file
    const jsonPath = path.join(process.cwd(), '../../../webhook-narrative.json');
    
    // Read current data
    const currentData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Find and update the node
    const nodeIndex = currentData.nodes.findIndex((node: EventStormingNode) => node.id === nodeId);
    if (nodeIndex === -1) {
      throw new Error(`Node with id "${nodeId}" not found`);
    }
    
    // Update the node with new fields
    currentData.nodes[nodeIndex] = {
      ...currentData.nodes[nodeIndex],
      ...updatedFields
    };
    
    // Write back to file
    fs.writeFileSync(jsonPath, JSON.stringify(currentData, null, 2));
    
    console.log(`✅ Successfully saved changes for node "${nodeId}"`);
    return { success: true, nodeId, updatedFields };
    
  } catch (error) {
    console.error(`❌ Failed to save changes for node "${nodeId}":`, error);
    throw error;
  }
}

/**
 * HTTP endpoint handler for POST /api/save-node
 */
export function createSaveEndpoint() {
  return async (req: any, res: any) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    
    try {
      const { nodeId, updatedFields } = req.body;
      
      if (!nodeId || !updatedFields) {
        res.status(400).json({ error: 'Missing nodeId or updatedFields' });
        return;
      }
      
      const result = await saveNodeChanges(nodeId, updatedFields);
      res.status(200).json(result);
      
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };
}