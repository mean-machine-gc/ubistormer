<script>
  import { onMount } from 'svelte';
  import CommandTooltip from './CommandTooltip.svelte';
  import AssertionTooltip from './AssertionTooltip.svelte';
  import DomainModelTooltip from './DomainModelTooltip.svelte';
  import OutcomeTooltip from './OutcomeTooltip.svelte';
  
  export let narrativeData = null;
  
  // Tooltip visibility and basic data (non-reactive parts)
  let tooltips = {
    command: { visible: false, nodeId: '', nodeLabel: '', position: { x: 100, y: 100 }, context: {} },
    assertion: { visible: false, nodeId: '', nodeLabel: '', position: { x: 100, y: 100 }, context: {} },
    domainModel: { visible: false, nodeId: '', nodeLabel: '', position: { x: 100, y: 100 }, context: {} },
    outcome: { visible: false, nodeId: '', nodeLabel: '', position: { x: 100, y: 100 }, context: {} }
  };

  // Reactive tooltip data - automatically updates when store changes
  $: commandTooltipData = (() => {
    if (!tooltips.command.visible || !tooltips.command.nodeId) return {};
    const nodeData = narrativeData?.nodes?.find(n => n.id === tooltips.command.nodeId) || {};
    return {
      businessContext: nodeData.businessContext || '',
      coreCommand: nodeData.coreCommand || '',
      shellCommand: nodeData.shellCommand || '',
      hydrationFunction: nodeData.hydrationFunction || '',
      context: tooltips.command.context
    };
  })();

  $: assertionTooltipData = (() => {
    if (!tooltips.assertion.visible || !tooltips.assertion.nodeId) return {};
    const nodeData = narrativeData?.nodes?.find(n => n.id === tooltips.assertion.nodeId) || {};
    return {
      assertion: nodeData.assertion || ''
    };
  })();

  $: domainModelTooltipData = (() => {
    if (!tooltips.domainModel.visible || !tooltips.domainModel.nodeId) return {};
    const nodeData = narrativeData?.nodes?.find(n => n.id === tooltips.domainModel.nodeId) || {};
    return {
      yaml: nodeData.yaml || '',
      businessContext: nodeData.businessContext || '',
      domainModel: nodeData.domainModel || '',
      objectExamples: nodeData.objectExamples || ''
    };
  })();

  $: outcomeTooltipData = (() => {
    if (!tooltips.outcome.visible || !tooltips.outcome.nodeId) return {};
    const nodeData = narrativeData?.nodes?.find(n => n.id === tooltips.outcome.nodeId) || {};
    return {
      outcomeAssertions: nodeData.outcomeAssertions || '',
      exampleState: nodeData.exampleState || ''
    };
  })();
  
  // Make show methods available globally so they can be called from App.svelte
  onMount(() => {
    window.tooltipManager = {
      showCommandTooltip,
      showAssertionTooltip,
      showDomainModelTooltip,
      showOutcomeTooltip,
      hideAllTooltips
    };
  });
  
  function showCommandTooltip(position, nodeId, nodeLabel, context = {}) {
    hideAllTooltips();
    
    // Just set visibility and basic info - reactive statements handle the data
    tooltips.command = {
      visible: true,
      nodeId,
      nodeLabel,
      position: { x: position.x, y: position.y },
      context
    };
  }
  
  function showAssertionTooltip(position, nodeId, nodeLabel, context = {}) {
    hideAllTooltips();
    
    // Just set visibility and basic info - reactive statements handle the data
    tooltips.assertion = {
      visible: true,
      nodeId,
      nodeLabel,
      position: { x: position.x, y: position.y },
      context
    };
  }
  
  function showDomainModelTooltip(position, nodeId, nodeLabel, context = {}) {
    hideAllTooltips();
    
    // Just set visibility and basic info - reactive statements handle the data
    tooltips.domainModel = {
      visible: true,
      nodeId,
      nodeLabel,
      position: { x: position.x, y: position.y },
      context
    };
  }
  
  function showOutcomeTooltip(position, nodeId, nodeLabel, context = {}) {
    hideAllTooltips();
    
    // Just set visibility and basic info - reactive statements handle the data
    tooltips.outcome = {
      visible: true,
      nodeId,
      nodeLabel,
      position: { x: position.x, y: position.y },
      context
    };
  }
  
  function hideAllTooltips() {
    tooltips.command.visible = false;
    tooltips.assertion.visible = false;
    tooltips.domainModel.visible = false;
    tooltips.outcome.visible = false;
  }
  
  function handleTooltipSave(type, event) {
    console.log(`Saved ${type} tooltip:`, event.detail);
    // You can add additional save handling here if needed
  }
</script>

<!-- Command Tooltip -->
<CommandTooltip
  bind:visible={tooltips.command.visible}
  nodeId={tooltips.command.nodeId}
  nodeLabel={tooltips.command.nodeLabel}
  position={tooltips.command.position}
  businessContext={commandTooltipData.businessContext}
  coreCommand={commandTooltipData.coreCommand}
  shellCommand={commandTooltipData.shellCommand}
  hydrationFunction={commandTooltipData.hydrationFunction}
  context={commandTooltipData.context}
  on:save={(e) => handleTooltipSave('command', e)}
  on:close={() => tooltips.command.visible = false}
/>

<!-- Assertion Tooltip -->
<AssertionTooltip
  bind:visible={tooltips.assertion.visible}
  nodeId={tooltips.assertion.nodeId}
  nodeLabel={tooltips.assertion.nodeLabel}
  position={tooltips.assertion.position}
  assertion={assertionTooltipData.assertion}
  on:save={(e) => handleTooltipSave('assertion', e)}
  on:close={() => tooltips.assertion.visible = false}
/>

<!-- Domain Model Tooltip -->
<DomainModelTooltip
  bind:visible={tooltips.domainModel.visible}
  nodeId={tooltips.domainModel.nodeId}
  nodeLabel={tooltips.domainModel.nodeLabel}
  position={tooltips.domainModel.position}
  yaml={domainModelTooltipData.yaml}
  businessContext={domainModelTooltipData.businessContext}
  domainModel={domainModelTooltipData.domainModel}
  objectExamples={domainModelTooltipData.objectExamples}
  on:save={(e) => handleTooltipSave('domainModel', e)}
  on:close={() => tooltips.domainModel.visible = false}
/>

<!-- Outcome Tooltip -->
<OutcomeTooltip
  bind:visible={tooltips.outcome.visible}
  nodeId={tooltips.outcome.nodeId}
  nodeLabel={tooltips.outcome.nodeLabel}
  position={tooltips.outcome.position}
  outcomeAssertions={outcomeTooltipData.outcomeAssertions}
  exampleState={outcomeTooltipData.exampleState}
  on:save={(e) => handleTooltipSave('outcome', e)}
  on:close={() => tooltips.outcome.visible = false}
/>