<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { makeDraggableWithId } from '../../../utils/draggable.ts';
  
  export let id;
  export let title = '';
  export let visible = false;
  export let position = { x: 100, y: 100 };
  export let width = '600px';
  export let minHeight = '400px';
  export let maxHeight = '80vh';
  
  const dispatch = createEventDispatcher();
  
  let tooltipElement;
  
  onMount(() => {
    if (tooltipElement) {
      // Make the tooltip draggable by its header
      makeDraggableWithId(tooltipElement, `${id}-header`);
    }
  });
  
  function handleClose() {
    visible = false;
    dispatch('close');
  }
  
  $: if (tooltipElement && visible) {
    tooltipElement.style.left = `${position.x}px`;
    tooltipElement.style.top = `${position.y}px`;
  }
</script>

<div 
  bind:this={tooltipElement}
  class="monaco-tooltip {visible ? 'visible' : ''}"
  style="width: {width}; min-height: {minHeight}; max-height: {maxHeight};"
>
  <div id="{id}-header" class="monaco-tooltip-header">
    <span class="monaco-tooltip-title">{title}</span>
    <button class="monaco-tooltip-close" on:click={handleClose}>×</button>
  </div>
  
  <div class="monaco-tooltip-content">
    <slot></slot>
  </div>
  
  <div class="monaco-tooltip-footer">
    <slot name="footer"></slot>
  </div>
</div>

<style>
  .monaco-tooltip {
    position: absolute;
    background: #1e1e1e;
    border: 1px solid #444;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    padding: 0;
    z-index: 10000;
    display: none;
    resize: both;
    overflow: hidden;
    min-width: 250px;
    min-height: 150px;
  }
  
  .monaco-tooltip.visible {
    display: flex;
    flex-direction: column;
  }
  
  .monaco-tooltip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background: #2a2a2a;
    border-bottom: 1px solid #444;
    cursor: move;
    user-select: none;
    flex-shrink: 0;
  }
  
  .monaco-tooltip-title {
    color: #fff;
    font-weight: bold;
    font-size: 14px;
  }
  
  .monaco-tooltip-close {
    background: none;
    border: none;
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  .monaco-tooltip-close:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .monaco-tooltip-content {
    padding: 15px;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  .monaco-tooltip-footer {
    padding: 10px 15px;
    border-top: 1px solid #444;
    background: #2a2a2a;
    flex-shrink: 0;
    display: flex;
    gap: 10px;
    align-items: center;
  }
</style>