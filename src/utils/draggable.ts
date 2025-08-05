export function makeDraggable(tooltip: HTMLElement): void {
  const header = tooltip.querySelector('#tooltip-header') as HTMLElement;
  if (!header) return;
  
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  header.addEventListener('mousedown', (e: MouseEvent) => {
    // Don't start drag if clicking any close button
    if ((e.target as HTMLElement).id.includes('close-')) {
      return;
    }
    
    isDragging = true;
    const rect = tooltip.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    // Change cursor and add visual feedback
    header.style.background = 'rgba(255,255,255,0.1)';
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep tooltip within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipRect = tooltip.getBoundingClientRect();
    
    const constrainedX = Math.max(0, Math.min(newX, viewportWidth - tooltipRect.width));
    const constrainedY = Math.max(0, Math.min(newY, viewportHeight - tooltipRect.height));
    
    tooltip.style.left = `${constrainedX}px`;
    tooltip.style.top = `${constrainedY}px`;
    
    e.preventDefault();
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      header.style.background = 'rgba(255,255,255,0.05)';
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  // Handle touch events for mobile
  header.addEventListener('touchstart', (e: TouchEvent) => {
    if ((e.target as HTMLElement).id.includes('close-')) {
      return;
    }
    
    isDragging = true;
    const touch = e.touches[0];
    const rect = tooltip.getBoundingClientRect();
    dragOffset.x = touch.clientX - rect.left;
    dragOffset.y = touch.clientY - rect.top;
    
    header.style.background = 'rgba(255,255,255,0.1)';
    e.preventDefault();
  });

  document.addEventListener('touchmove', (e: TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const newX = touch.clientX - dragOffset.x;
    const newY = touch.clientY - dragOffset.y;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipRect = tooltip.getBoundingClientRect();
    
    const constrainedX = Math.max(0, Math.min(newX, viewportWidth - tooltipRect.width));
    const constrainedY = Math.max(0, Math.min(newY, viewportHeight - tooltipRect.height));
    
    tooltip.style.left = `${constrainedX}px`;
    tooltip.style.top = `${constrainedY}px`;
    
    e.preventDefault();
  });

  document.addEventListener('touchend', () => {
    if (isDragging) {  
      isDragging = false;
      header.style.background = 'rgba(255,255,255,0.05)';
    }
  });
}

export function makeDraggableWithId(tooltip: HTMLElement, headerId: string): void {
  const header = tooltip.querySelector(`#${headerId}`) as HTMLElement;
  if (!header) return;
  
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  header.addEventListener('mousedown', (e: MouseEvent) => {
    // Don't start drag if clicking the close button
    if ((e.target as HTMLElement).id.includes('close-')) {
      return;
    }
    
    isDragging = true;
    const rect = tooltip.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    // Change cursor and add visual feedback
    header.style.background = 'rgba(255,255,255,0.1)';
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep tooltip within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipRect = tooltip.getBoundingClientRect();
    
    const constrainedX = Math.max(0, Math.min(newX, viewportWidth - tooltipRect.width));
    const constrainedY = Math.max(0, Math.min(newY, viewportHeight - tooltipRect.height));
    
    tooltip.style.left = `${constrainedX}px`;
    tooltip.style.top = `${constrainedY}px`;
    
    e.preventDefault();
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      header.style.background = 'rgba(255,255,255,0.05)';
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}