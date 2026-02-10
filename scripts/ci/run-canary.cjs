#!/usr/bin/env node

const { spawnSync } = require('child_process');

const result = spawnSync('node', ['e2e/run-canaries.cjs'], {
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
