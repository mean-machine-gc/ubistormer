<script>
  import { narrativeData } from '../../stores/index.ts';
  import { currentPath } from '../../stores/settings.ts';
  
  let isSaving = false;
  let lastSaveResult = null;
  
  async function saveToFile() {
    if (isSaving || !$narrativeData) return;
    
    try {
      isSaving = true;
      lastSaveResult = null;
      
      // Get the current JSON path from settings store
      const savedPath = $currentPath;
      
      // Save the current narrative data to file
      const response = await fetch('/api/tooltip-save/save-graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-json-path': savedPath
        },
        body: JSON.stringify({ 
          data: $narrativeData 
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        lastSaveResult = { success: true, message: 'Graph saved successfully!' };
        console.log('✅ Graph saved to:', result.filePath);
      } else {
        const error = await response.json();
        lastSaveResult = { success: false, message: error.error || 'Save failed' };
        console.error('❌ Save failed:', error);
      }
      
    } catch (error) {
      lastSaveResult = { success: false, message: error.message };
      console.error('❌ Save error:', error);
    } finally {
      isSaving = false;
      
      // Clear status message after 3 seconds
      setTimeout(() => {
        lastSaveResult = null;
      }, 3000);
    }
  }
</script>

<div class="save-section">
  <button 
    class="save-button" 
    class:saving={isSaving}
    disabled={isSaving || !$narrativeData}
    on:click={saveToFile}
  >
    {#if isSaving}
      💾 Saving...
    {:else}
      💾 Save Graph
    {/if}
  </button>
  
  {#if lastSaveResult}
    <div class="save-status" class:success={lastSaveResult.success} class:error={!lastSaveResult.success}>
      {lastSaveResult.message}
    </div>
  {/if}
</div>

<style>
  .save-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .save-button {
    background: #3182ce;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  
  .save-button:hover:not(:disabled) {
    background: #2c5aa0;
    transform: translateY(-1px);
  }
  
  .save-button:disabled {
    background: #4a5568;
    cursor: not-allowed;
    transform: none;
  }
  
  .save-button.saving {
    background: #38a169;
  }
  
  .save-status {
    font-size: 12px;
    padding: 6px 8px;
    border-radius: 4px;
    text-align: center;
    font-weight: 500;
  }
  
  .save-status.success {
    background: #c6f6d5;
    color: #22543d;
    border: 1px solid #9ae6b4;
  }
  
  .save-status.error {
    background: #fed7d7;
    color: #742a2a;
    border: 1px solid #feb2b2;
  }
</style>