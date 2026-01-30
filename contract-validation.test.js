// contract-validation.test.js
// Deterministic contract validation tests for canaries-with-teeth
// Node.js, no external deps. Fails loudly on contract violation.

const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error('CONTRACT VIOLATION:', msg);
  process.exit(1);
}

function checkField(obj, field, type) {
  if (!(field in obj)) fail(`Missing required field: ${field}`);
  if (typeof obj[field] !== type) fail(`Field ${field} must be type ${type}`);
}

function checkRange(val, min, max, field) {
  if (val < min || val > max) fail(`Field ${field} out of range: ${val}`);
}

// Validate function-health.contract.md
(function validateFunctionHealth() {
  const contract = require('./contracts/function-health.contract.md.json');
  // Usar latencyMsP95 según contrato actual
  checkField(contract, 'latencyMsP95', 'number');
  checkRange(contract.latencyMsP95, 0, 60000, 'latencyMsP95');
  // Calcular errorRate si no está presente
  let errorRate = contract.errorRate;
  if (typeof errorRate !== 'number') {
    if ('errorCount' in contract && 'invocationCount' in contract && contract.invocationCount > 0) {
      errorRate = contract.errorCount / contract.invocationCount;
    } else {
      fail('Missing errorRate or fields to compute it');
    }
  }
  checkRange(errorRate, 0, 1, 'errorRate');
  checkField(contract, 'coldStartMs', 'number');
  checkRange(contract.coldStartMs, 0, 60000, 'coldStartMs');
  checkField(contract, 'logicalDrift', 'number');
  checkRange(contract.logicalDrift, 0, 1, 'logicalDrift');
  checkField(contract, 'healthStatus', 'string');
  if (!['OK','WARN','BLOCK'].includes(contract.healthStatus)) fail('Invalid healthStatus');
})();

// Validate friction-budget.contract.md
(function validateFrictionBudget() {
  const contract = require('./contracts/friction-budget.contract.md.json');
  checkField(contract, 'frictionTypes', 'object');
  if (!Array.isArray(contract.frictionTypes)) fail('frictionTypes must be array');
  contract.frictionTypes.forEach(ft => {
    checkField(ft, 'type', 'string');
    checkField(ft, 'weight', 'number');
    checkRange(ft.weight, 0, 1, 'weight');
  });
  checkField(contract, 'score', 'number');
  checkRange(contract.score, 0, 100, 'score');
  checkField(contract, 'budget', 'number');
  checkRange(contract.budget, 0, 100, 'budget');
  if (contract.score > contract.budget && !contract.reason) fail('Missing reason for over-budget');
})();

console.log('All contract validations passed.');
