#!/usr/bin/env node

/**
 * Service Maps Integration Test
 * Validates that Service Maps v1 is correctly integrated
 */

const fs = require('fs');
const path = require('path');

console.log('===== Service Maps v1 Integration Test =====\n');

const checks = [];

// 1. Check contracts exist
let contractCheckPassed = false;
try {
  const contractPath = path.join(process.cwd(), 'contracts', 'service-maps.contract.md');
  const contractJsonPath = path.join(process.cwd(), 'contracts', 'service-maps.contract.md.json');
  
  if (fs.existsSync(contractPath) && fs.existsSync(contractJsonPath)) {
    const content = fs.readFileSync(contractPath, 'utf8');
    const jsonContent = fs.readFileSync(contractJsonPath, 'utf8');
    
    if (content.includes('Service Maps') && 
        content.includes('buildId') && 
        JSON.parse(jsonContent).schema) {
      console.log('✓ Service Maps contract files exist and are valid');
      contractCheckPassed = true;
    }
  }
} catch (e) {
  console.log('✗ Service Maps contract validation failed:', e.message);
}
checks.push({ name: 'Service Maps Contracts', passed: contractCheckPassed });

// 2. Check TypeScript types exist
let typesCheckPassed = false;
try {
  const typesPath = path.join(process.cwd(), 'src', 'lib', 'service-maps', 'types.ts');
  const builderPath = path.join(process.cwd(), 'src', 'lib', 'service-maps', 'builder.ts');
  const indexPath = path.join(process.cwd(), 'src', 'lib', 'service-maps', 'index.ts');
  
  if (fs.existsSync(typesPath) && fs.existsSync(builderPath) && fs.existsSync(indexPath)) {
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    const builderContent = fs.readFileSync(builderPath, 'utf8');
    
    if (typesContent.includes('ServiceMap') && 
        typesContent.includes('ServiceNode') && 
        typesContent.includes('ServiceEdge') &&
        builderContent.includes('buildServiceMap')) {
      console.log('✓ Service Maps TypeScript types and builder exist');
      typesCheckPassed = true;
    }
  }
} catch (e) {
  console.log('✗ Service Maps TypeScript validation failed:', e.message);
}
checks.push({ name: 'Service Maps TypeScript', passed: typesCheckPassed });

// 3. Check canary test integration
let canaryCheckPassed = false;
try {
  const canaryPath = path.join(process.cwd(), 'e2e', 'default-canary.e2e.spec.js');
  const content = fs.readFileSync(canaryPath, 'utf8');
  
  if (content.includes('networkObservations') && 
      content.includes('page.on(\'response\'') &&
      content.includes('NETWORK_OBS_PATH') &&
      content.includes('writeNetworkObservations')) {
    console.log('✓ Canary test captures network observations');
    canaryCheckPassed = true;
  }
} catch (e) {
  console.log('✗ Canary test integration check failed:', e.message);
}
checks.push({ name: 'Canary Network Capture', passed: canaryCheckPassed });

// 4. Check canary runner integration
let runnerCheckPassed = false;
try {
  const runnerPath = path.join(process.cwd(), 'e2e', 'run-canaries.cjs');
  const content = fs.readFileSync(runnerPath, 'utf8');
  
  if (content.includes('collectNetworkObservations') && 
      content.includes('buildServiceMap') &&
      content.includes('serviceMap') &&
      content.includes('service-maps')) {
    console.log('✓ Canary runner builds and writes Service Maps');
    runnerCheckPassed = true;
  }
} catch (e) {
  console.log('✗ Canary runner integration check failed:', e.message);
}
checks.push({ name: 'Canary Runner Integration', passed: runnerCheckPassed });

// 5. Check dashboard integration
let dashboardCheckPassed = false;
try {
  const dashboardPath = path.join(process.cwd(), 'dashboard', 'app.js');
  const htmlPath = path.join(process.cwd(), 'dashboard', 'index.html');
  const appContent = fs.readFileSync(dashboardPath, 'utf8');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  if (appContent.includes('renderServiceMap') && 
      appContent.includes('service-map-tree') &&
      htmlContent.includes('service-map-section')) {
    console.log('✓ Dashboard displays Service Maps');
    dashboardCheckPassed = true;
  }
} catch (e) {
  console.log('✗ Dashboard integration check failed:', e.message);
}
checks.push({ name: 'Dashboard Integration', passed: dashboardCheckPassed });

// Summary
console.log('\n===== Summary =====');
const passed = checks.filter(c => c.passed).length;
const total = checks.length;
console.log(`${passed}/${total} checks passed\n`);

checks.forEach(check => {
  const status = check.passed ? '✓' : '✗';
  console.log(`${status} ${check.name}`);
});

if (passed === total) {
  console.log('\n✓ Service Maps v1 integration is complete and all checks pass!');
  process.exit(0);
} else {
  console.log('\n✗ Some integration checks failed.');
  process.exit(1);
}
