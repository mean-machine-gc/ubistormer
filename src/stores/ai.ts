import { writable, derived, get } from 'svelte/store';

// Types for AI store
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AIProcessInfo {
  pid?: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped';
  port?: number;
}

export interface ConnectionStatus {
  color: string;
  text: string;
}

export type ConnectionState = 'connected' | 'disconnected' | 'connecting';
export type AIType = 'claude' | 'gpt' | 'local';

// AI Chat state
export const isAiChatVisible = writable<boolean>(true);
export const isAiChatMinimized = writable<boolean>(false);
export const aiConnection = writable<ConnectionState>('disconnected');
export const currentAI = writable<AIType>('claude');
export const aiMessages = writable<AIMessage[]>([]);
export const isThinking = writable<boolean>(false);

// WebSocket instance (not reactive, just for management)
let wsInstance: WebSocket | null = null;

// AI process states
export const aiProcesses = writable<Map<AIType, AIProcessInfo>>(new Map());

// Derived stores
export const connectionStatus = derived<typeof aiConnection, ConnectionStatus>(
  aiConnection,
  ($connection) => {
    const colors: Record<ConnectionState, string> = {
      connected: '#38a169',
      disconnected: '#e53e3e', 
      connecting: '#f39c12'
    };
    return {
      color: colors[$connection] || colors.disconnected,
      text: $connection
    };
  }
);

export const aiRunningStatus = derived<[typeof aiProcesses, typeof currentAI], boolean>(
  [aiProcesses, currentAI],
  ([$processes, $currentAI]) => {
    return $processes.has($currentAI);
  }
);

// Helper functions
export function addMessage(role: AIMessage['role'], content: string): void {
  const message: AIMessage = {
    id: `${Date.now()}-${Math.random()}`,
    role,
    content,
    timestamp: Date.now()
  };
  
  aiMessages.update(messages => [...messages, message]);
}

export function showThinking(): void {
  isThinking.set(true);
}

export function hideThinking(): void {
  isThinking.set(false);
}

export function toggleAiChat(): void {
  isAiChatVisible.update(visible => !visible);
}

export function minimizeAiChat(): void {
  isAiChatMinimized.set(true);
}

export function restoreAiChat(): void {
  isAiChatMinimized.set(false);
}

export function setWebSocketInstance(ws: WebSocket | null): void {
  wsInstance = ws;
}

export function getWebSocketInstance(): WebSocket | null {
  return wsInstance;
}

export function sendAiMessage(message: string): void {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    addMessage('user', message);
    showThinking();
    
    wsInstance.send(JSON.stringify({
      type: 'ai-message',
      ai: get(currentAI) || 'claude',
      message
    }));
  }
}

export function startAI(aiType: AIType, jsonFilePath: string): void {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify({
      type: 'start-ai',
      ai: aiType,
      jsonFilePath
    }));
  }
}

export function stopAI(aiType: AIType): void {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify({
      type: 'stop-ai',
      ai: aiType
    }));
  }
}