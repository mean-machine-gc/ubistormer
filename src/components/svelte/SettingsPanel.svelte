<script>
  import { 
    isSettingsVisible, 
    currentPath, 
    settingsStatus, 
    pathDisplayName,
    showSettingsStatus,
    toggleSettings,
    hideSettings 
  } from '../../stores/settings.ts';
  
  let pathInput = '';
  
  // Initialize path input with current path
  $: pathInput = $currentPath;
  
  // Handle status auto-hide
  $: if ($settingsStatus.visible) {
    if ($settingsStatus.type !== 'persistent') {
      setTimeout(() => {
        settingsStatus.update(status => ({ ...status, visible: false }));
      }, 3000);
    }
  }
  
  async function savePath() {
    const newPath = pathInput.trim();
    if (newPath) {
      currentPath.set(newPath);
      showSettingsStatus('✅ Path saved successfully!', 'success');
    } else {
      showSettingsStatus('❌ Please enter a valid path', 'error');
    }
  }
  
  async function testPath() {
    const path = pathInput.trim();
    if (!path) {
      showSettingsStatus('❌ Please enter a path to test', 'error');
      return;
    }
    
    try {
      const response = await fetch('/api/tooltip-save/test-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSettingsStatus('✅ File accessible and valid JSON!', 'success');
      } else {
        showSettingsStatus(`❌ ${result.error}`, 'error');
      }
    } catch (error) {
      showSettingsStatus(`❌ Failed to test path: ${error.message}`, 'error');
    }
  }
  
  function resetPath() {
    const defaultPath = '/Users/giovanni/PROJ/webhook/webhook-narrative.json';
    pathInput = defaultPath;
    currentPath.set(defaultPath);
    showSettingsStatus('🔄 Path reset to default', 'info');
  }
  
  function browsePath() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const fileName = e.target.files[0].name;
        showSettingsStatus(`📁 Selected: ${fileName}. Please enter the full path manually.`, 'info');
      }
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }
  
  function reloadData() {
    window.location.reload();
  }
  
  function createBackup() {
    showSettingsStatus('💾 Backup functionality coming soon...', 'info');
  }
  
  function handleKeydown(event) {
    if (event.key === 'Enter') {
      savePath();
    }
  }
  
  function handleOutsideClick(event) {
    if ($isSettingsVisible && !event.target.closest('#settings-panel') && !event.target.closest('#settings-toggle-btn')) {
      hideSettings();
    }
  }
</script>

<svelte:window on:click={handleOutsideClick} />

<!-- Settings Toggle Button -->
{#if !$isSettingsVisible}
  <button 
    id="settings-toggle-btn"
    class="settings-toggle"
    on:click={toggleSettings}
  >
    <span class="icon">⚙️</span>
    Settings
  </button>
{/if}

<!-- Settings Panel -->
{#if $isSettingsVisible}
  <div id="settings-panel" class="settings-panel">
    <!-- Header -->
    <div class="header">
      <h3>EventStorming Settings</h3>
      <button class="close-btn" on:click={hideSettings}>×</button>
    </div>

    <!-- JSON File Path Setting -->
    <div class="section">
      <label class="label">EventStorming JSON File Path</label>
      
      <div class="input-row">
        <input 
          bind:value={pathInput}
          type="text" 
          class="path-input"
          placeholder="/path/to/your/eventstorming-data.json"
          on:keydown={handleKeydown}
        />
        <button class="browse-btn" on:click={browsePath}>Browse</button>
      </div>

      <div class="button-row">
        <button class="save-btn" on:click={savePath}>Save Path</button>
        <button class="test-btn" on:click={testPath}>Test Access</button>
        <button class="reset-btn" on:click={resetPath}>Reset</button>
      </div>

      <div class="tip">
        <strong>Tip:</strong> This should be an absolute path to your EventStorming JSON file. 
        The UI will read and write to this file for real-time collaboration.
      </div>
    </div>

    <!-- Status Display -->
    {#if $settingsStatus.visible}
      <div class="status status-{$settingsStatus.type}">
        {$settingsStatus.message}
      </div>
    {/if}

    <!-- Quick Actions -->
    <div class="quick-actions">
      <div class="quick-actions-label">Quick Actions:</div>
      <div class="button-grid">
        <button class="quick-btn reload" on:click={reloadData}>Reload Data</button>
        <button class="quick-btn backup" on:click={createBackup}>Create Backup</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #2d3748;
    border: 1px solid #4a5568;
    border-radius: 8px;
    color: #e2e8f0;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 10001;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }
  
  .settings-toggle:hover {
    background: #4a5568;
    transform: translateY(-1px);
  }
  
  .icon {
    font-size: 16px;
  }

  .settings-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 500px;
    background: #1a202c;
    border: 1px solid #2d3748;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 10002;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #2d3748;
  }

  .header h3 {
    color: #e2e8f0;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #a0aec0;
    cursor: pointer;
    font-size: 18px;
    padding: 0;
    line-height: 1;
  }

  .section {
    margin-bottom: 20px;
  }

  .label {
    display: block;
    color: #e2e8f0;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .input-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .path-input {
    flex: 1;
    background: #2d3748;
    border: 1px solid #4a5568;
    border-radius: 6px;
    color: #e2e8f0;
    padding: 8px 12px;
    font-size: 13px;
    font-family: 'Monaco', 'Menlo', monospace;
    outline: none;
  }

  .path-input:focus {
    border-color: #3182ce;
    box-shadow: 0 0 0 1px #3182ce;
  }

  .browse-btn {
    background: #4a5568;
    color: #e2e8f0;
    border: none;
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap;
  }

  .button-row {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .save-btn {
    background: #38a169;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .test-btn {
    background: #3182ce;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .reset-btn {
    background: #e53e3e;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .tip {
    color: #a0aec0;
    font-size: 12px;
    line-height: 1.4;
  }

  .status {
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    margin-bottom: 16px;
  }

  .status-success {
    background: rgba(56, 161, 105, 0.2);
    border: 1px solid rgba(56, 161, 105, 0.4);
    color: #38a169;
  }

  .status-error {
    background: rgba(229, 62, 62, 0.2);
    border: 1px solid rgba(229, 62, 62, 0.4);
    color: #e53e3e;
  }

  .status-info {
    background: rgba(49, 130, 206, 0.2);
    border: 1px solid rgba(49, 130, 206, 0.4);
    color: #3182ce;
  }

  .quick-actions {
    padding-top: 12px;
    border-top: 1px solid #2d3748;
    margin-top: 16px;
  }

  .quick-actions-label {
    color: #a0aec0;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .button-grid {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .quick-btn {
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 11px;
    color: white;
  }

  .quick-btn.reload {
    background: #805ad5;
  }

  .quick-btn.backup {
    background: #f39c12;
  }

  button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  button:active {
    transform: scale(0.98);
  }
</style>