import fs from 'fs';
import path from 'path';

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function isProtectedBranch() {
  const ref = process.env.GITHUB_REF || '';
  return ref === 'refs/heads/main' || /^refs\/tags\/v[0-9]/.test(ref);
}

function isPullRequest() {
  const event = process.env.GITHUB_EVENT_NAME || '';
  return event === 'pull_request';
}

function writeResult(obj) {
  fs.mkdirSync(path.dirname('artifacts/gating/release-gate.json'), { recursive: true });
  fs.writeFileSync('artifacts/gating/release-gate.json', JSON.stringify(obj, null, 2));
}

function printSummary(obj) {
  console.log('--- Release Gate Summary ---');
  console.log('Decision:', obj.decision);
  if (obj.reason) console.log('Reason:', obj.reason);
  if (obj.details) console.log('Details:', obj.details);
  console.log('----------------------------');
}

function main() {
  const canary = readJson('artifacts/gating/canary.json');
  const risk = readJson('artifacts/gating/risk.json');
  let decision = 'ALLOW';
  let reason = '';
  let exitCode = 0;

  if (!canary || canary.status !== 'PASS') {
    decision = 'BLOCK';
    reason = 'Canary failed or missing';
    exitCode = 1;
  } else if (!risk || !risk.decision) {
    decision = 'BLOCK';
    reason = 'Risk decision missing or invalid';
    exitCode = 1;
  } else if (risk.decision === 'BLOCK') {
    decision = 'BLOCK';
    reason = 'Risk decision BLOCK';
    exitCode = 1;
  } else if (risk.decision === 'SOFT_BLOCK') {
    if (isProtectedBranch()) {
      decision = 'BLOCK';
      reason = 'SOFT_BLOCK on protected branch/tag';
      exitCode = 1;
    } else if (isPullRequest()) {
      decision = 'SOFT_BLOCK';
      reason = 'SOFT_BLOCK on PR';
      exitCode = 2;
    } else {
      decision = 'SOFT_BLOCK';
      reason = 'SOFT_BLOCK on non-protected branch';
      exitCode = 2;
    }
  }

  writeResult({ decision, reason, details: { canary, risk } });
  printSummary({ decision, reason, details: { canary, risk } });
  process.exit(exitCode);
}

main();
