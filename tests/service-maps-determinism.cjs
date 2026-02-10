#!/usr/bin/env node

/**
 * Service Maps Determinism Test
 * Validates that:
 * - Hash computation is deterministic
 * - Diff generation is deterministic
 * - Replay produces identical artifacts
 * - Diffs accurately describe changes
 */

const crypto = require('crypto');

// ============================================================================
// SERVICE MAP FUNCTIONS (copied from e2e/run-canaries.cjs for testing)
// ============================================================================

function computeP95(values) {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((95 / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function computeHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function extractServiceName(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname || '';
    const pathname = parsed.pathname || '';

    if (hostname.includes('api')) return 'api';
    if (hostname.includes('auth')) return 'auth';
    if (hostname.includes('search')) return 'search';
    if (hostname.includes('payment')) return 'payment';

    const segments = pathname.split('/').filter(s => s.length > 0);
    if (segments.length > 0) {
      const first = segments[0].toLowerCase();
      if (!/\.(js|css|png|jpg|gif|svg|ico)$/i.test(first) && first.length <= 30) {
        return first;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function buildServiceMap(buildId, networkObservations) {
  const nodes = [];
  const edgeMap = new Map();

  nodes.push({ id: 'frontend', type: 'frontend' });

  for (const obs of networkObservations) {
    const serviceName = extractServiceName(obs.url);
    if (!serviceName) continue;

    if (!nodes.find(n => n.id === serviceName)) {
      nodes.push({ id: serviceName, type: 'service' });
    }

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

  const edges = [];
  for (const [edgeKey, metrics] of edgeMap.entries()) {
    const [from, to] = edgeKey.split('→');
    const latencyP95 = computeP95(metrics.latencies);
    const errorRate = metrics.totalRequests > 0 ? metrics.errorCount / metrics.totalRequests : 0;

    edges.push({
      from,
      to,
      latencyP95: Math.round(latencyP95),
      errorRate: Math.round(errorRate * 10000) / 10000,
    });
  }

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => {
    const cmp = a.from.localeCompare(b.from);
    return cmp !== 0 ? cmp : a.to.localeCompare(b.to);
  });

  const canonicalJson = JSON.stringify({ buildId, nodes, edges });
  const hash = computeHash(canonicalJson);

  return { buildId, hash, nodes, edges };
}

function buildServiceMapDiff(buildId, currentMap, baselineMap) {
  const addedNodes = [];
  const removedNodes = [];
  const addedEdges = [];
  const removedEdges = [];
  const changedEdges = [];

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

    const baselineEdgeMap = new Map();
    for (const edge of baselineMap.edges) {
      baselineEdgeMap.set(`${edge.from}→${edge.to}`, edge);
    }

    const currentEdgeMap = new Map();
    for (const edge of currentMap.edges) {
      currentEdgeMap.set(`${edge.from}→${edge.to}`, edge);
    }

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

  const diffContent = {
    buildId,
    addedNodes,
    removedNodes,
    addedEdges,
    removedEdges,
    changedEdges,
    criticalPath: null,
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

// ============================================================================
// TEST SUITE
// ============================================================================

console.log('===== Service Maps Determinism Tests =====\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passCount++;
  } else {
    console.log(`✗ ${message}`);
    failCount++;
  }
}

// Test 1: Deterministic hash for identical inputs
console.log('Test 1: Deterministic hash for identical inputs');
const obs1 = [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 150, timestamp: 1000 },
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 160, timestamp: 2000 },
  { url: 'https://auth.example.com/verify', statusCode: 200, latencyMs: 50, timestamp: 3000 },
];
const map1a = buildServiceMap('build-001', obs1);
const map1b = buildServiceMap('build-001', obs1);
assert(map1a.hash === map1b.hash, 'Identical inputs produce identical hash');
assert(map1a.hash.length === 64, 'Hash is valid SHA256 hex (64 chars)');
console.log();

// Test 2: Different inputs produce different hashes
console.log('Test 2: Different inputs produce different hashes');
const obs2a = [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 150, timestamp: 1000 },
];
const obs2b = [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 160, timestamp: 1000 },
];
const map2a = buildServiceMap('build-002', obs2a);
const map2b = buildServiceMap('build-002', obs2b);
assert(map2a.hash !== map2b.hash, 'Different inputs produce different hashes');
console.log();

// Test 3: Deterministic diff generation
console.log('Test 3: Deterministic diff generation');
const map3Current = buildServiceMap('build-003-current', obs1);
const map3Baseline = buildServiceMap('build-003-baseline', obs1);
const diff3a = buildServiceMapDiff('build-003', map3Current, map3Baseline);
const diff3b = buildServiceMapDiff('build-003', map3Current, map3Baseline);
assert(diff3a.hash === diff3b.hash, 'Identical diff inputs produce identical hash');
console.log();

// Test 4: Diff accurately captures added nodes
console.log('Test 4: Diff accurately captures added nodes');
const baseline4 = buildServiceMap('base', [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 100, timestamp: 1000 },
]);
const current4 = buildServiceMap('current', [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 100, timestamp: 1000 },
  { url: 'https://auth.example.com/verify', statusCode: 200, latencyMs: 50, timestamp: 2000 },
]);
const diff4 = buildServiceMapDiff('test', current4, baseline4);
assert(diff4.addedNodes.length === 1, 'One node added');
assert(diff4.addedNodes[0].id === 'auth', 'Added node is auth service');
assert(diff4.addedEdges.length === 1, 'One edge added');
console.log();

// Test 5: Diff accurately captures removed nodes
console.log('Test 5: Diff accurately captures removed nodes');
const baseline5 = buildServiceMap('base', [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 100, timestamp: 1000 },
  { url: 'https://auth.example.com/verify', statusCode: 200, latencyMs: 50, timestamp: 2000 },
]);
const current5 = buildServiceMap('current', [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 100, timestamp: 1000 },
]);
const diff5 = buildServiceMapDiff('test', current5, baseline5);
assert(diff5.removedNodes.length === 1, 'One node removed');
assert(diff5.removedNodes[0].id === 'auth', 'Removed node is auth service');
assert(diff5.removedEdges.length === 1, 'One edge removed');
console.log();

// Test 6: Diff accurately captures latency changes
console.log('Test 6: Diff accurately captures latency changes');
const baseline6 = buildServiceMap('base', [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 100, timestamp: 1000 },
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 100, timestamp: 2000 },
]);
const current6 = buildServiceMap('current', [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 150, timestamp: 1000 },
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 160, timestamp: 2000 },
]);
const diff6 = buildServiceMapDiff('test', current6, baseline6);
assert(diff6.changedEdges.length === 1, 'One edge changed');
assert(diff6.changedEdges[0].latencyChange > 0, 'Latency increased (positive delta)');
assert(diff6.changedEdges[0].latencyChange === 60, 'Latency change is 60ms (160-100)');
console.log();

// Test 7: Diff accurately captures error rate changes
console.log('Test 7: Diff accurately captures error rate changes');
const baseline7 = buildServiceMap('base', [
  { url: 'https://api.example.com/data', statusCode: 200, latencyMs: 100, timestamp: 1000 },
  { url: 'https://api.example.com/data', statusCode: 200, latencyMs: 100, timestamp: 2000 },
]);
const current7 = buildServiceMap('current', [
  { url: 'https://api.example.com/data', statusCode: 200, latencyMs: 100, timestamp: 1000 },
  { url: 'https://api.example.com/data', statusCode: 500, latencyMs: 100, timestamp: 2000 },
]);
const diff7 = buildServiceMapDiff('test', current7, baseline7);
assert(diff7.changedEdges.length === 1, 'One edge changed');
assert(diff7.changedEdges[0].errorRateChange === 0.5, 'Error rate changed by 50% (0.5)'  );
console.log();

// Test 8: Replay produces identical map
console.log('Test 8: Replay produces identical map (same build ID)');
const obs8 = [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 150, timestamp: 1000 },
  { url: 'https://api.example.com/posts', statusCode: 200, latencyMs: 200, timestamp: 2000 },
];
const replay8a = buildServiceMap('build-008', obs8);
const replay8b = buildServiceMap('build-008', obs8);
assert(JSON.stringify(replay8a) === JSON.stringify(replay8b), 'Replay produces identical map');
console.log();

// Test 9: No baseline produces all-added diff
console.log('Test 9: No baseline produces all-added diff');
const obs9 = [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 100, timestamp: 1000 },
];
const current9 = buildServiceMap('build', obs9);
const diff9 = buildServiceMapDiff('build', current9, null);
assert(diff9.baselineMapHash === null, 'Baseline hash is null');
assert(diff9.addedNodes.length === 2, 'Both frontend and service are added (no baseline)');
assert(diff9.addedEdges.length === 1, 'Edge is marked as added');
assert(diff9.removedNodes.length === 0, 'No nodes removed');
assert(diff9.removedEdges.length === 0, 'No edges removed');
console.log();

// Test 10: Deterministic ordering with shuffled input
console.log('Test 10: Deterministic ordering with shuffled input');
const baseObs = [
  { url: 'https://api.example.com/data', statusCode: 200, latencyMs: 100, timestamp: 1000 },
  { url: 'https://auth.example.com/verify', statusCode: 200, latencyMs: 50, timestamp: 2000 },
  { url: 'https://search.example.com/query', statusCode: 200, latencyMs: 300, timestamp: 3000 },
];
const shuffledObs = [
  baseObs[2], baseObs[0], baseObs[1], baseObs[0], baseObs[2], baseObs[1],
];
const mapBase = buildServiceMap('test', baseObs);
const mapShuffled = buildServiceMap('test', shuffledObs);
assert(JSON.stringify(mapBase) === JSON.stringify(mapShuffled), 'Shuffled input produces identical map');
console.log();

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n===== Summary =====');
console.log(`✓ Passed: ${passCount}`);
console.log(`✗ Failed: ${failCount}`);

if (failCount === 0) {
  console.log('\n✓ All determinism tests passed!');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed');
  process.exit(1);
}
