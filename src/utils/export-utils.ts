export function toPascalCase(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '').replace(/^./, str => str.toUpperCase());
}

export function toSnakeCase(str) {
  return str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export function downloadYAML(content, filename) {
  const blob = new Blob([content], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}