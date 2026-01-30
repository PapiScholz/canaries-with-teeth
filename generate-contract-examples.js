// generate-contract-examples.js
// Automatiza la generación de ejemplos válidos para contratos .md.json
// Lee los archivos .md.json y, si no tienen ejemplo, agrega uno basado en los campos de outputs/inputs

const fs = require('fs');
const path = require('path');

const contractsDir = path.join(__dirname, 'contracts');
const files = fs.readdirSync(contractsDir).filter(f => f.endsWith('.md.json'));

function exampleValue(field) {
  if (field.enum) return field.enum[0];
  if (field.type === 'string') return field.name + '_example';
  if (field.type === 'integer' || field.type === 'number') return 1;
  if (field.type === 'boolean') return false;
  if (field.type === 'array') return [];
  if (field.type === 'object') return {};
  return null;
}

files.forEach(file => {
  const filePath = path.join(contractsDir, file);
  const contract = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  // Detect if already has example (heuristic: has any output field as property)
  const outputs = contract.outputs || [];
  let needsExample = false;
  outputs.forEach(f => {
    if (!(f.name in contract)) needsExample = true;
  });
  if (!needsExample) return;
  // Add example values for all output fields
  outputs.forEach(f => {
    if (!(f.name in contract)) contract[f.name] = exampleValue(f);
  });
  fs.writeFileSync(filePath, JSON.stringify(contract, null, 2));
  console.log('Ejemplo agregado a', file);
});

console.log('Generación automática de ejemplos completada.');
