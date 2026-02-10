#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const crypto = require('crypto');

const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts', 'gating');
const DASHBOARD_DIR = path.join(process.cwd(), 'artifacts', 'dashboard');
const HISTORY_FILE = path.join(process.cwd(), '.canary-history.json');
const METRICS_FILE = path.join(ARTIFACTS_DIR, 'canary-metrics.json');
const CANARY_STATUS_ENV = path.join(process.cwd(), 'canary-status.env');

const STARTUP_TIMEOUT_MS = 60000;
const POLL_INTERVAL_MS = 1000;
const MIN_BASELINE_SAMPLES = 5;
const MAX_BASELINE_SAMPLES = 50;
const REGRESSION_MULTIPLIER = 1.5;
const REGRESSION_MIN_DELTA_MS = 500;

let appProcess = null;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(filePath, obj) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function getNpxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

function getBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.CANARIES_BASE_URL) return process.env.CANARIES_BASE_URL;
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

function detectAppCommand() {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  let pkg = null;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return null;
  }
  const scripts = pkg.scripts || {};
  if (scripts.dev) return { cmd: getNpmCommand(), args: ['run', 'dev'] };
  if (scripts.start) return { cmd: getNpmCommand(), args: ['start'] };
  return null;
}

function requestOnce(targetUrl) {
  return new Promise(resolve => {
    let timedOut = false;
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(
      {
        method: 'GET',
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname || '/',
      },
      res => {
        res.resume();
        resolve(res.statusCode || 0);
      }
    );

    req.on('error', () => resolve(0));
    req.setTimeout(5000, () => {
      timedOut = true;
      req.destroy();
    });
    req.on('close', () => {
      if (timedOut) resolve(0);
    });
    req.end();
  });
}

async function waitForHealthyUrl(targetUrl, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (appProcess && appProcess.exitCode !== null) {
      throw new Error('App process exited before becoming healthy');
    }
    const status = await requestOnce(targetUrl);
    if (status >= 200 && status < 300) return;
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Timed out waiting for ${targetUrl}`);
}

function stopAppProcess() {
  if (!appProcess || appProcess.killed) return;
  if (process.platform === 'win32') {
    try {
      const killer = spawn('taskkill', ['/pid', String(appProcess.pid), '/t', '/f'], {
        stdio: 'ignore'
      });
      killer.on('error', () => {
        appProcess.kill('SIGTERM');
      });
    } catch {
      appProcess.kill('SIGTERM');
    }
  } else {
    try {
      process.kill(-appProcess.pid, 'SIGTERM');
    } catch {
      appProcess.kill('SIGTERM');
    }
  }
}

function registerExitHandlers() {
  const cleanup = () => {
    stopAppProcess();
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(1);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(1);
  });
  process.on('uncaughtException', err => {
    console.error(err);
    cleanup();
    process.exit(1);
  });
}

function runPlaywright(baseUrl) {
  return new Promise(resolve => {
    const cmd = getNpxCommand();
    const args = [
      'playwright',
      'test',
      'e2e/default-canary.e2e.spec.js',
      '--reporter=json'
    ];
    const env = { ...process.env, BASE_URL: baseUrl };
    let stdout = '';
    let stderr = '';
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', data => {
      stdout += data.toString();
    });
    child.stderr.on('data', data => {
      stderr += data.toString();
    });
    child.on('close', code => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function collectTelemetry() {
  let events = [];
  try {
    const telemetryPath = path.join(process.cwd(), 'canaries-artifacts', 'telemetry.ndjson');
    if (fs.existsSync(telemetryPath)) {
      events = fs.readFileSync(telemetryPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(JSON.parse);
    }
  } catch {}
  return events;
}

function computeRisk(events) {
  let score = 0;
  const reasons = [];
  const errorCount = events.filter(e => e.type === 'js-error' || e.type === 'promise-rejection').length;
  const longTasks = events.filter(e => e.type === 'long-task').length;
  if (errorCount > 0) {
    score += 40;
    reasons.push('JS errors detected');
  }
  if (longTasks > 2) {
    score += 20;
    reasons.push('Long tasks detected');
  }
  if (score === 0) reasons.push('No major issues');
  return { score, reasons };
}

function collectNetworkObservations() {
  let observations = [];
  try {
    const obsPath = path.join(process.cwd(), 'artifacts', 'gating', 'network-observations.json');
    if (fs.existsSync(obsPath)) {
      observations = JSON.parse(fs.readFileSync(obsPath, 'utf8')) || [];
    }
  } catch {}
  return observations;
}

function buildServiceMap(buildId, networkObservations) {
  const nodes = [];
  const edgeMap = new Map();

  // Always add frontend node
  nodes.push({ id: 'frontend', type: 'frontend' });

  // Process network observations
  for (const obs of networkObservations) {
    const serviceName = extractServiceName(obs.url);
    if (!serviceName) continue;

    // Ensure service node exists
    if (!nodes.find(n => n.id === serviceName)) {
      nodes.push({ id: serviceName, type: 'service' });
    }

    // Accumulate metrics to this service
    const edgeKey = `frontend→${serviceName}`;
    const metrics = edgeMap.get(edgeKey) || {
      totalRequests: 0,
      errorCount: 0,
      latencies: [],
    };

    metrics.totalRequests += 1;
    metrics.latencies.push(obs.latencyMs || 0);
    if (obs.statusCode >= 400) {
      metrics.errorCount += 1;
    }

    edgeMap.set(edgeKey, metrics);
  }

  // Build edges from accumulated metrics
  const edges = [];
  for (const [edgeKey, metrics] of edgeMap.entries()) {
    const [from, to] = edgeKey.split('→');
    const latencyP95 = computeP95(metrics.latencies);
    const errorRate = metrics.totalRequests > 0 ? metrics.errorCount / metrics.totalRequests : 0;

    edges.push({
      from,
      to,
      latencyP95: Math.round(latencyP95),
      errorRate: Math.round(errorRate * 10000) / 10000, // 4 decimals
    });
  }

  // Sort deterministically
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => {
    const cmp = a.from.localeCompare(b.from);
    return cmp !== 0 ? cmp : a.to.localeCompare(b.to);
  });

  // Compute hash for determinism validation and replay support
  const canonicalJson = JSON.stringify({ buildId, nodes, edges });
  const hash = computeHash(canonicalJson);

  return { buildId, hash, nodes, edges };
}

function extractServiceName(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname || '';
    const pathname = parsed.pathname || '';

    // Try hostname-based extraction
    if (hostname.includes('api')) return 'api';
    if (hostname.includes('auth')) return 'auth';
    if (hostname.includes('search')) return 'search';
    if (hostname.includes('payment')) return 'payment';

    // Try path-based extraction (first path segment)
    const segments = pathname.split('/').filter(s => s.length > 0);
    if (segments.length > 0) {
      const first = segments[0].toLowerCase();
      // Filter out common file extensions
      if (!/\.(js|css|png|jpg|gif|svg|ico)$/i.test(first) && first.length <= 30) {
        return first;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function computeP95(values) {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((95 / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Compute SHA256 hash of canonical JSON
 * Used for determinism validation and replay support
 */
function computeHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Add hash to Service Map
 * Deterministic: same inputs produce identical hash
 */
function hashServiceMap(serviceMap) {
  const canonicalJson = JSON.stringify({
    buildId: serviceMap.buildId,
    nodes: serviceMap.nodes,
    edges: serviceMap.edges,
  });
  const hash = computeHash(canonicalJson);
  return { ...serviceMap, hash };
}

/**
 * Build Service Map Diff comparing current to baseline
 * Facts only: added/removed nodes, added/removed edges, numeric deltas
 */
function buildServiceMapDiff(buildId, currentMap, baselineMap) {
  const addedNodes = [];
  const removedNodes = [];
  const addedEdges = [];
  const removedEdges = [];
  const changedEdges = [];

  // If no baseline, everything in current is "added"
  if (!baselineMap) {
    for (const node of currentMap.nodes) {
      addedNodes.push({ id: node.id, type: node.type });
    }
    for (const edge of currentMap.edges) {
      addedEdges.push({
        from: edge.from,
        to: edge.to,
        latencyP95: edge.latencyP95,
        errorRate: edge.errorRate,
      });
    }
  } else {
    // Compare nodes
    const baselineNodeIds = new Set(baselineMap.nodes.map(n => n.id));
    const currentNodeIds = new Set(currentMap.nodes.map(n => n.id));

    for (const node of currentMap.nodes) {
      if (!baselineNodeIds.has(node.id)) {
        addedNodes.push({ id: node.id, type: node.type });
      }
    }

    for (const node of baselineMap.nodes) {
      if (!currentNodeIds.has(node.id)) {
        removedNodes.push({ id: node.id, type: node.type });
      }
    }

    // Compare edges
    const baselineEdgeMap = new Map();
    for (const edge of baselineMap.edges) {
      baselineEdgeMap.set(`${edge.from}→${edge.to}`, edge);
    }

    const currentEdgeMap = new Map();
    for (const edge of currentMap.edges) {
      currentEdgeMap.set(`${edge.from}→${edge.to}`, edge);
    }

    // Added and changed edges
    for (const edge of currentMap.edges) {
      const key = `${edge.from}→${edge.to}`;
      const baselineEdge = baselineEdgeMap.get(key);

      if (!baselineEdge) {
        addedEdges.push({
          from: edge.from,
          to: edge.to,
          latencyP95: edge.latencyP95,
          errorRate: edge.errorRate,
        });
      } else if (
        baselineEdge.latencyP95 !== edge.latencyP95 ||
        baselineEdge.errorRate !== edge.errorRate
      ) {
        changedEdges.push({
          from: edge.from,
          to: edge.to,
          baselineLatencyP95: baselineEdge.latencyP95,
          currentLatencyP95: edge.latencyP95,
          latencyChange: edge.latencyP95 - baselineEdge.latencyP95,
          baselineErrorRate: baselineEdge.errorRate,
          currentErrorRate: edge.errorRate,
          errorRateChange: edge.errorRate - baselineEdge.errorRate,
        });
      }
    }

    // Removed edges
    for (const edge of baselineMap.edges) {
      const key = `${edge.from}→${edge.to}`;
      if (!currentEdgeMap.has(key)) {
        removedEdges.push({
          from: edge.from,
          to: edge.to,
          baselineLatencyP95: edge.latencyP95,
          baselineErrorRate: edge.errorRate,
        });
      }
    }
  }

  // Sort deterministically
  addedNodes.sort((a, b) => a.id.localeCompare(b.id));
  removedNodes.sort((a, b) => a.id.localeCompare(b.id));
  addedEdges.sort((a, b) => {
    const cmp = a.from.localeCompare(b.from);
    return cmp !== 0 ? cmp : a.to.localeCompare(b.to);
  });
  removedEdges.sort((a, b) => {
    const cmp = a.from.localeCompare(b.from);
    return cmp !== 0 ? cmp : a.to.localeCompare(b.to);
  });
  changedEdges.sort((a, b) => {
    const cmp = a.from.localeCompare(b.from);
    return cmp !== 0 ? cmp : a.to.localeCompare(b.to);
  });

  // Build diff object with deterministic hash
  const diffContent = {
    buildId,
    addedNodes,
    removedNodes,
    addedEdges,
    removedEdges,
    changedEdges,
    criticalPath: null, // Non-normative, null for v1
  };
  const canonicalJson = JSON.stringify(diffContent);
  const hash = computeHash(canonicalJson);

  return {
    buildId,
    hash,
    baselineMapHash: baselineMap?.hash || null,
    addedNodes,
    removedNodes,
    addedEdges,
    removedEdges,
    changedEdges,
    criticalPath: null,
  };
}

/**
 * Load baseline Service Map from previous stable build
 * Returns null if no baseline exists
 */
function loadBaseline(serviceMapsDir) {
  const baselineFile = path.join(serviceMapsDir, 'baseline.json');
  if (!fs.existsSync(baselineFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save current map as baseline for next run
 * This is typically done after a successful release
 */
function saveAsBaseline(serviceMapsDir, serviceMap) {
  const baselineFile = path.join(serviceMapsDir, 'baseline.json');
  fs.mkdirSync(serviceMapsDir, { recursive: true });
  fs.writeFileSync(baselineFile, JSON.stringify(serviceMap, null, 2));
}

function gateRelease(canaryPassed, riskScore) {
  if (!canaryPassed) return { decision: 'BLOCK', reasons: ['E2E canary failed'] };
  if (riskScore > 70) return { decision: 'BLOCK', reasons: [`Risk score ${riskScore} > 70`] };
  if (riskScore >= 51 && riskScore <= 70) return { decision: 'SOFT_BLOCK', reasons: [`Risk score ${riskScore} between 51 and 70`] };
  return { decision: 'ALLOW', reasons: ['All gating conditions passed'] };
}

function clampSamples(samples) {
  if (samples.length <= MAX_BASELINE_SAMPLES) return samples;
  return samples.slice(samples.length - MAX_BASELINE_SAMPLES);
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function updateHistory(baseUrl, metrics, status) {
  const existing = readJson(HISTORY_FILE) || {};
  const samples = Array.isArray(existing.samples) ? existing.samples : [];
  const entry = {
    timestamp: new Date().toISOString(),
    baseUrl,
    status,
    metrics: metrics || null,
  };
  if (metrics) {
    samples.push(entry);
  }
  const trimmedSamples = clampSamples(samples);
  const baseline = { ...existing.p95Baseline };
  const goodSamples = trimmedSamples.filter(sample => sample.status === 'PASS' && sample.metrics);
  if (goodSamples.length >= MIN_BASELINE_SAMPLES) {
    const navValues = goodSamples.map(sample => sample.metrics.navigationMs).filter(v => Number.isFinite(v));
    const dclValues = goodSamples.map(sample => sample.metrics.domContentLoadedMs).filter(v => Number.isFinite(v));
    const loadValues = goodSamples.map(sample => sample.metrics.loadMs).filter(v => Number.isFinite(v));
    baseline.navigationMs = percentile(navValues, 95);
    baseline.domContentLoadedMs = percentile(dclValues, 95);
    baseline.loadMs = percentile(loadValues, 95);
    baseline.sampleCount = goodSamples.length;
    baseline.computedAt = new Date().toISOString();
  }
  const nextHistory = {
    schemaVersion: 1,
    minSamples: MIN_BASELINE_SAMPLES,
    maxSamples: MAX_BASELINE_SAMPLES,
    samples: trimmedSamples,
    p95Baseline: baseline,
  };
  writeJson(HISTORY_FILE, nextHistory);
  return nextHistory;
}

function detectRegression(metrics, baseline) {
  const reasons = [];
  if (!metrics || !baseline) return { reasons };
  const checks = [
    { key: 'navigationMs', label: 'Navigation time', value: metrics.navigationMs, baseline: baseline.navigationMs },
    { key: 'domContentLoadedMs', label: 'DOMContentLoaded time', value: metrics.domContentLoadedMs, baseline: baseline.domContentLoadedMs },
    { key: 'loadMs', label: 'Load time', value: metrics.loadMs, baseline: baseline.loadMs },
  ];

  checks.forEach(check => {
    if (!Number.isFinite(check.value) || !Number.isFinite(check.baseline)) return;
    const delta = check.value - check.baseline;
    if (check.value > check.baseline * REGRESSION_MULTIPLIER && delta >= REGRESSION_MIN_DELTA_MS) {
      reasons.push(`${check.label} regression (${Math.round(check.value)}ms > p95 ${Math.round(check.baseline)}ms)`);
    }
  });

  return { reasons };
}

function buildDashboardReport(canaryStatus, risk, gate, history, serviceMap, serviceMapDiff) {
  const recentRuns = (history?.samples || []).slice(-5).map(sample => ({
    date: sample.timestamp,
    status: sample.status
  }));
  return {
    title: 'Canary Dashboard',
    status: canaryStatus,
    riskDecision: gate.decision,
    riskScore: risk.score,
    riskScoreHistory: [risk.score],
    blockingReasons: gate.reasons,
    recentRuns,
    serviceMap: serviceMap || null,
    serviceMapDiff: serviceMapDiff || null
  };
}

async function main() {
  registerExitHandlers();

  const startedAt = new Date().toISOString();
  const baseUrl = getBaseUrl();
  const urlMode = Boolean(process.env.BASE_URL);
  const failureMode = process.env.CANARY_FAILURE_MODE || 'none';

  let playwrightResult = { code: 1, stdout: '', stderr: '' };
  let canaryPassed = false;
  let canaryStatus = 'FAIL';
  let metrics = null;
  let history = null;
  let regression = { reasons: [] };
  let errorMessage = null;

  try {
    if (!urlMode) {
      const command = detectAppCommand();
      if (!command) throw new Error('No npm dev/start script found. Define one or set BASE_URL.');
      appProcess = spawn(command.cmd, command.args, {
        env: process.env,
        stdio: 'inherit',
        detached: process.platform !== 'win32'
      });
      await waitForHealthyUrl(baseUrl, STARTUP_TIMEOUT_MS);
    }

    playwrightResult = await runPlaywright(baseUrl);
  } catch (err) {
    errorMessage = err?.message || String(err);
  } finally {
    stopAppProcess();
  }

  metrics = readJson(METRICS_FILE);
  history = updateHistory(baseUrl, metrics, playwrightResult.code === 0 ? 'PASS' : 'FAIL');
  regression = detectRegression(metrics, history?.p95Baseline);

  const forcedFailure = failureMode && failureMode !== 'none';
  canaryPassed = playwrightResult.code === 0 && regression.reasons.length === 0 && !forcedFailure;
  canaryStatus = canaryPassed ? 'PASS' : 'FAIL';

  if (forcedFailure) {
    regression.reasons.push(`Forced failure mode: ${failureMode}`);
  }

  const telemetry = collectTelemetry();
  const risk = computeRisk(telemetry);
  const gate = gateRelease(canaryPassed, risk.score);

  const canaryResult = {
    status: canaryStatus,
    baseUrl,
    urlMode,
    startedAt,
    endedAt: new Date().toISOString(),
    metrics,
    regression,
    failureMode,
    errorMessage,
    playwright: {
      exitCode: playwrightResult.code,
      stdout: playwrightResult.stdout.slice(0, 4000),
      stderr: playwrightResult.stderr.slice(0, 4000)
    }
  };

  const gateResult = {
    decision: gate.decision,
    reasons: gate.reasons,
    inputs: {
      canaryPassed,
      riskScore: risk.score
    },
    timestamp: new Date().toISOString()
  };

  writeJson(path.join(ARTIFACTS_DIR, 'canary.json'), canaryResult);
  writeJson(path.join(ARTIFACTS_DIR, 'release-gate.json'), gateResult);
  
  // Build and write Service Map
  const buildId = process.env.BUILD_ID || startedAt.replace(/[:\-\.]/g, '').slice(0, 14);
  const networkObs = collectNetworkObservations();
  const serviceMap = buildServiceMap(buildId, networkObs);
  const serviceMapsDir = path.join(process.cwd(), 'artifacts', 'service-maps');
  fs.mkdirSync(serviceMapsDir, { recursive: true });
  writeJson(path.join(serviceMapsDir, `${buildId}.json`), serviceMap);
  
  // Build and write Service Map Diff
  const baseline = loadBaseline(serviceMapsDir);
  const serviceMapDiff = buildServiceMapDiff(buildId, serviceMap, baseline);
  writeJson(path.join(serviceMapsDir, `${buildId}.diff.json`), serviceMapDiff);
  
  writeJson(path.join(DASHBOARD_DIR, 'report.json'), buildDashboardReport(canaryStatus, risk, gate, history, serviceMap, serviceMapDiff));
  
  fs.writeFileSync(CANARY_STATUS_ENV, `CANARY_PASSED=${String(canaryPassed).toLowerCase()}\n`);

  console.log(gate.decision);
  gate.reasons.forEach(reason => console.log(reason));

  if (!canaryPassed) process.exit(1);
}

main();
