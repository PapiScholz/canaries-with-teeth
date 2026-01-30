#!/usr/bin/env node

// Zero-config CLI for canaries-with-teeth
const fs = require('fs');
const path = require('path');

function log(msg) {
  process.stdout.write(msg + '\n');
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, { encoding: 'utf8' });
}

function detectRepoType() {
  // Best effort: look for frontend/backend markers
  const files = fs.readdirSync(process.cwd());
  if (files.includes('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    if (pkg.dependencies && pkg.dependencies['react']) return 'frontend';
    if (pkg.dependencies && pkg.dependencies['express']) return 'backend';
    return 'fullstack';
  }
  return 'unknown';
}

function setupFoldersAndConfig() {
  ensureDir('canaries-artifacts');
  ensureDir('canaries-dashboard');
  ensureDir('.github/workflows');
  // Minimal config for MODE 0
  writeFile('canaries.config.json', JSON.stringify({ mode: 0, created: new Date().toISOString() }, null, 2));
}

function setupCIWorkflow() {
  const ci = `name: Canaries Release Gate
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
jobs:
  canaries:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm install
      - name: Run canaries
        run: npx canaries run
      - name: Upload dashboard
        uses: actions/upload-artifact@v3
        with:
          name: canaries-dashboard
          path: canaries-dashboard/
`;
  writeFile('.github/workflows/canaries.yml', ci);
}

function main() {
  log('Initializing canaries-with-teeth (MODE 0)...');
  const repoType = detectRepoType();
  log('Detected repo type: ' + repoType);
  setupFoldersAndConfig();
  setupCIWorkflow();
  log('Canaries system initialized. Ready for git push.');
}

main();
