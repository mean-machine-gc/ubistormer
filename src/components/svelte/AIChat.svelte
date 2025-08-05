<script>
  import { onMount } from 'svelte';
  import { 
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
    sendAiMessage,
    startAI,
    stopAI
  } from '../../stores/ai.ts';
  import { currentPath, pathDisplayName } from '../../stores/settings.ts';
  
  let inputMessage = '';
  let messagesContainer;
  let ws = null;
  let chatElement;
  let isDragging = false;
  let startX, startY, initialX, initialY;
  
  $: aiOptions = [
    { value: 'gemini', label: 'Gemini' },
    { value: 'claude', label: 'Claude' }
  ];
  
  onMount(() => {
    connectWebSocket();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  });
  
  // Auto-scroll messages
  $: if ($aiMessages && messagesContainer) {
    setTimeout(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 0);
  }
  
  function connectWebSocket() {
    try {
      ws = new WebSocket('ws://localhost:3003');
      setWebSocketInstance(ws);
      
      ws.onopen = () => {
        console.log('✅ Connected to AI Bridge');
        aiConnection.set('connected');
        addMessage('system', 'Connected to AI Assistant');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      ws.onclose = () => {
        console.log('❌ Disconnected from AI Bridge');
        aiConnection.set('disconnected');
        addMessage('system', 'Disconnected from AI Assistant');
        
        // Attempt reconnection after 3 seconds
        setTimeout(() => connectWebSocket(), 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addMessage('system', 'Connection error. Retrying...');
      };
      
    } catch (error) {
      console.error('Failed to connect to AI Bridge:', error);
      addMessage('system', 'Failed to connect. Make sure the server is running.');
    }
  }
  
  function handleWebSocketMessage(data) {
    switch (data.type) {
      case 'ai-response':
        hideThinking();
        addMessage('assistant', data.message);
        break;
      case 'ai-error':
        hideThinking();
        addMessage('system', `Error: ${data.message}`);
        break;
      case 'error':
        hideThinking();
        addMessage('system', data.message);
        break;
      case 'info':
        addMessage('system', data.message);
        break;
      case 'ai-started':
        addMessage('system', `${data.ai || 'AI'} process started successfully`);
        aiProcesses.update(processes => {
          processes.set(data.ai || $currentAI, { status: 'running' });
          return processes;
        });
        break;
      case 'ai-closed':
        addMessage('system', `${data.ai || 'AI'} process closed (code: ${data.code})`);
        aiProcesses.update(processes => {
          processes.delete(data.ai || $currentAI);
          return processes;
        });
        break;
    }
  }
  
  function handleSendMessage() {
    if (inputMessage.trim() && $aiConnection === 'connected') {
      sendAiMessage(inputMessage.trim());
      inputMessage = '';
    }
  }
  
  function handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }
  
  function handleStartAI() {
    startAI($currentAI, $currentPath);
    const pathDisplay = $pathDisplayName;
    addMessage('system', `Starting ${$currentAI} in ${pathDisplay} directory...`);
  }
  
  function handleStopAI() {
    stopAI($currentAI);
    addMessage('system', `Stopping ${$currentAI}...`);
  }
  
  function formatMessage(content) {
    // Escape HTML
    content = content.replace(/&/g, '&amp;')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;');
    
    // Convert code blocks
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, __, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });
    
    // Convert inline code
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert line breaks
    content = content.replace(/\n/g, '<br>');
    
    return content;
  }
  
  // Dragging functionality
  function handleMouseDown(event) {
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    
    const rect = chatElement.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    
    document.body.style.cursor = 'move';
    event.preventDefault();
  }
  
  function handleMouseMove(event) {
    if (!isDragging) return;
    
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    
    chatElement.style.left = `${initialX + deltaX}px`;
    chatElement.style.top = `${initialY + deltaY}px`;
    chatElement.style.right = 'auto';
    chatElement.style.bottom = 'auto';
  }
  
  function handleMouseUp() {
    isDragging = false;
    document.body.style.cursor = '';
  }
</script>

<svelte:window on:mousemove={handleMouseMove} on:mouseup={handleMouseUp} />

{#if $isAiChatVisible}
  <!-- Main Chat Window -->
  {#if !$isAiChatMinimized}
    <div 
      bind:this={chatElement}
      class="ai-chat"
      class:dragging={isDragging}
    >
      <!-- Header -->
      <div class="header" on:mousedown={handleMouseDown}>
        <div class="header-left">
          <div 
            class="status-indicator" 
            style="background: {$connectionStatus.color}"
          ></div>
          <span class="title">AI Assistant</span>
          <select 
            bind:value={$currentAI}
            class="ai-selector"
            disabled={$aiRunningStatus}
          >
            {#each aiOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
        <div class="header-buttons">
          {#if $aiRunningStatus}
            <button class="stop-btn" on:click={handleStopAI}>Stop</button>
          {:else}
            <button class="start-btn" on:click={handleStartAI}>Start</button>
          {/if}
          <button class="minimize-btn" on:click={minimizeAiChat}>−</button>
          <button class="close-btn" on:click={toggleAiChat}>×</button>
        </div>
      </div>

      <!-- Messages Area -->
      <div bind:this={messagesContainer} class="messages">
        {#if $aiMessages.length === 0}
          <div class="welcome-message">
            Select an AI and click "Start" to begin chatting!
          </div>
        {:else}
          {#each $aiMessages as message (message.id)}
            <div class="message message-{message.type}">
              {@html formatMessage(message.content)}
            </div>
          {/each}
          
          {#if $isThinking}
            <div class="message message-assistant thinking">
              <div class="thinking-content">
                <div class="thinking-dots">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </div>
                <span class="thinking-text">{$currentAI} is thinking...</span>
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <textarea 
          bind:value={inputMessage}
          placeholder="Ask AI..."
          class="input"
          on:keydown={handleKeydown}
        ></textarea>
        <button 
          class="send-btn" 
          on:click={handleSendMessage}
          disabled={!inputMessage.trim() || $aiConnection !== 'connected'}
        >
          Send
        </button>
      </div>
    </div>
  {/if}

  <!-- Minimized State -->
  {#if $isAiChatMinimized}
    <div class="minimized-chat" on:click={restoreAiChat}>
      <div 
        class="minimized-status" 
        style="background: {$connectionStatus.color}"
      ></div>
      <span>AI Chat</span>
    </div>
  {/if}
{/if}

<style>
  .ai-chat {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    height: 500px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 10000;
    transition: all 0.3s ease;
  }

  .ai-chat.dragging {
    transition: none;
  }

  .header {
    background: #2d3748;
    padding: 12px 16px;
    border-radius: 12px 12px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
    user-select: none;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .title {
    color: #e2e8f0;
    font-weight: 600;
    font-size: 14px;
  }

  .ai-selector {
    background: #1a202c;
    color: #e2e8f0;
    border: 1px solid #4a5568;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 12px;
    cursor: pointer;
  }

  .ai-selector:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .header-buttons {
    display: flex;
    gap: 8px;
  }

  .start-btn {
    background: #38a169;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .stop-btn {
    background: #e53e3e;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .minimize-btn, .close-btn {
    background: transparent;
    border: none;
    color: #a0aec0;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
  }

  .minimize-btn {
    font-size: 18px;
  }

  .close-btn {
    font-size: 16px;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .messages::-webkit-scrollbar {
    width: 6px;
  }

  .messages::-webkit-scrollbar-track {
    background: #2d3748;
    border-radius: 3px;
  }

  .messages::-webkit-scrollbar-thumb {
    background: #4a5568;
    border-radius: 3px;
  }

  .messages::-webkit-scrollbar-thumb:hover {
    background: #718096;
  }

  .welcome-message {
    text-align: center;
    color: #718096;
    font-size: 13px;
    margin-top: 20px;
  }

  .message {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.5;
    max-width: 85%;
    word-wrap: break-word;
  }

  .message-user {
    background: #3182ce;
    color: white;
    align-self: flex-end;
    margin-left: auto;
  }

  .message-assistant {
    background: #2d3748;
    color: #e2e8f0;
    align-self: flex-start;
    border: 1px solid #4a5568;
  }

  .message-system {
    background: #805ad5;
    color: white;
    align-self: center;
    font-size: 12px;
    opacity: 0.8;
  }

  .thinking {
    opacity: 0.8;
    animation: fadeIn 0.3s ease-in;
  }

  .thinking-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .thinking-dots {
    display: inline-flex;
    gap: 2px;
  }

  .thinking-dots span {
    animation: thinking 1.4s infinite ease-in-out;
    font-weight: bold;
    font-size: 16px;
  }

  .thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
  .thinking-dots span:nth-child(2) { animation-delay: -0.16s; }
  .thinking-dots span:nth-child(3) { animation-delay: 0s; }

  .thinking-text {
    opacity: 0.7;
  }

  @keyframes thinking {
    0%, 80%, 100% { 
      opacity: 0.3;
      transform: scale(0.8);
    }
    40% { 
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 0.8; transform: translateY(0); }
  }

  .input-area {
    padding: 16px;
    border-top: 1px solid #2d3748;
    display: flex;
    gap: 8px;
  }

  .input {
    flex: 1;
    background: #2d3748;
    border: 1px solid #4a5568;
    border-radius: 8px;
    color: #e2e8f0;
    padding: 8px 12px;
    font-size: 14px;
    resize: none;
    outline: none;
    font-family: inherit;
    min-height: 40px;
    max-height: 120px;
  }

  .input:focus {
    border-color: #3182ce;
  }

  .send-btn {
    background: #3182ce;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    transition: background 0.2s;
  }

  .send-btn:hover:not(:disabled) {
    background: #2c5aa0;
  }

  .send-btn:active {
    transform: scale(0.98);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .minimized-chat {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #2d3748;
    border: 1px solid #333;
    border-radius: 50px;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    z-index: 10000;
  }

  .minimized-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .minimized-chat span {
    color: #e2e8f0;
    font-size: 14px;
    font-weight: 500;
  }

  /* Global styles for code formatting */
  :global(.message pre) {
    background: #1a202c;
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 8px 0;
  }

  :global(.message code) {
    background: #1a202c;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 13px;
  }
</style>