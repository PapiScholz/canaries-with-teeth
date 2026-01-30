#!/usr/bin/env node
// Runs E2E canary, collects telemetry, computes risk, gates release, and generates dashboard
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCanary() {
  try {
    execSync('npx playwright test e2e/default-canary.e2e.spec.js --reporter=json', { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

function collectTelemetry() {
  // MODE 0: Read NDJSON or localStorage dump
  let events = [];
  try {
    if (fs.existsSync('canaries-artifacts/telemetry.ndjson')) {
      events = fs.readFileSync('canaries-artifacts/telemetry.ndjson', 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    }
  } catch {}
  return events;
}

function computeRisk(events) {
  // Deterministic: use existing formulas (simulate for MODE 0)
  let score = 0;
  let reasons = [];
  const errorCount = events.filter(e => e.type === 'js-error' || e.type === 'promise-rejection').length;
  const longTasks = events.filter(e => e.type === 'long-task').length;
  if (errorCount > 0) { score += 40; reasons.push('JS errors detected'); }
  if (longTasks > 2) { score += 20; reasons.push('Long tasks detected'); }
  if (score === 0) reasons.push('No major issues');
  return { score, reasons };
}

function gateRelease(canaryPassed, riskScore) {
  // Use src/gating/release-gate.ts logic
  if (!canaryPassed) return { decision: 'BLOCK', reasons: ['E2E canary failed'] };
  if (riskScore > 70) return { decision: 'BLOCK', reasons: [`Risk score ${riskScore} > 70`] };
  if (riskScore >= 51 && riskScore <= 70) return { decision: 'SOFT_BLOCK', reasons: [`Risk score ${riskScore} between 51 and 70`] };
  return { decision: 'ALLOW', reasons: ['All gating conditions passed'] };
}

function writeDashboard(canaryPassed, risk, gate) {
  const html = `<!DOCTYPE html><html><head><title>Canaries Dashboard</title></head><body>
    <h1>Canaries Dashboard</h1>
    <h2>Canary Status: ${canaryPassed ? 'PASS' : 'FAIL'}</h2>
    <h2>Risk Score: ${risk.score}</h2>
    <h2>Release Gate: ${gate.decision}</h2>
    <h3>Reasons:</h3><ul>${gate.reasons.map(r => `<li>${r}</li>`).join('')}</ul>
    <h3>Recent Runs:</h3><pre>${JSON.stringify({ canaryPassed, risk, gate }, null, 2)}</pre>
    </body></html>`;
  fs.writeFileSync('canaries-dashboard/index.html', html);
}

function main() {
  const canaryPassed = runCanary();
  const telemetry = collectTelemetry();
  const risk = computeRisk(telemetry);
  const gate = gateRelease(canaryPassed, risk.score);
  writeDashboard(canaryPassed, risk, gate);
  // Output for CI
  console.log(gate.decision);
  gate.reasons.forEach(r => console.log(r));
}

main();
