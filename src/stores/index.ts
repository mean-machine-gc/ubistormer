// Centralized exports for all stores
// Graph stores - now powered by EventStorming API!
export {
  apiStore,
  graphData,
  filters,
  appState,
  filteredNodes,
  filteredEdges,
  graphOperations,
  graphStats,
  // Advanced reactive data
  processFlows,
  aggregateViews,
  graphValidation,
  graphHealth,
  criticalNodes,
  // Operations
  analysisOperations,
  fileOperations
} from './eventstorming-store.js';

// Legacy aliases for backward compatibility
export { graphData as narrativeData } from './eventstorming-store.js';
export { appState as isLoading } from './eventstorming-store.js';

export {
  isSettingsVisible,
  currentPath,
  settingsStatus,
  currentLayout,
  pathDisplayName,
  showSettingsStatus,
  toggleSettings,
  hideSettings
} from './settings.js';

export {
  isAiChatVisible,
  isAiChatMinimized,
  aiConnection,
  currentAI,
  aiMessages,
  isThinking,
  aiProcesses,
  connectionStatus,
  aiRunningStatus,
  addMessage,
  showThinking,
  hideThinking,
  toggleAiChat,
  minimizeAiChat,
  restoreAiChat,
  setWebSocketInstance,
  getWebSocketInstance,
  sendAiMessage,
  startAI,
  stopAI
} from './ai.js';