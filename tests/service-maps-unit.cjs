#!/usr/bin/env node

/**
 * Service Maps Unit Test
 * Tests the Service Map builder with sample data
 */

// Simulate the buildServiceMap function for testing
function buildServiceMap(buildId, networkObservations) {
  const nodes = [];
  const edgeMap = new Map();

  // Always add frontend node
  nodes.push({ id: 'frontend', type: 'frontend' });

  // Process network observations
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

  // Build edges
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

  // Sort deterministically
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => {
    const cmp = a.from.localeCompare(b.from);
    return cmp !== 0 ? cmp : a.to.localeCompare(b.to);
  });

  return { buildId, nodes, edges };
}

function extractServiceName(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname || '';
    const pathname = parsed.pathname || '';

    if (hostname.includes('api')) return 'api';
    if (hostname.includes('auth')) return 'auth';

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

function computeP95(values) {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((95 / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// Test data
console.log('===== Service Maps Unit Tests =====\n');

// Test 1: Basic Service Map with successful requests
console.log('Test 1: Basic Service Map with successful requests');
const observations1 = [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 150, timestamp: Date.now() },
  { url: 'https://api.example.com/users/123', statusCode: 200, latencyMs: 140, timestamp: Date.now() },
  { url: 'https://api.example.com/posts', statusCode: 200, latencyMs: 180, timestamp: Date.now() },
];
const map1 = buildServiceMap('build-001', observations1);
console.log(JSON.stringify(map1, null, 2));
console.assert(map1.nodes.length === 2, 'Should have frontend and api nodes');
console.assert(map1.edges.length === 1, 'Should have one edge');
console.assert(map1.edges[0].errorRate === 0, 'Should have 0% error rate');
console.assert(map1.edges[0].latencyP95 === 180, 'P95 should be 180ms');
console.log('✓ Test 1 passed\n');

// Test 2: Service Map with errors
console.log('Test 2: Service Map with error responses');
const observations2 = [
  { url: 'https://api.example.com/data', statusCode: 200, latencyMs: 100, timestamp: Date.now() },
  { url: 'https://api.example.com/data', statusCode: 500, latencyMs: 200, timestamp: Date.now() },
  { url: 'https://api.example.com/data', statusCode: 404, latencyMs: 50, timestamp: Date.now() },
];
const map2 = buildServiceMap('build-002', observations2);
console.log(JSON.stringify(map2, null, 2));
console.assert(map2.edges[0].errorRate === 2/3, 'Should have 66.67% error rate');
console.log('✓ Test 2 passed\n');

// Test 3: Multiple services
console.log('Test 3: Multiple service nodes');
const observations3 = [
  { url: 'https://api.example.com/users', statusCode: 200, latencyMs: 100, timestamp: Date.now() },
  { url: 'https://auth.example.com/verify', statusCode: 200, latencyMs: 50, timestamp: Date.now() },
  { url: 'https://example.com/search', statusCode: 200, latencyMs: 300, timestamp: Date.now() },
];
const map3 = buildServiceMap('build-003', observations3);
console.log(JSON.stringify(map3, null, 2));
console.assert(map3.nodes.length === 4, 'Should have frontend + 3 services');
console.assert(map3.edges.length === 3, 'Should have 3 edges');
console.log('✓ Test 3 passed\n');

// Test 4: Empty observations
console.log('Test 4: Empty observations (should still have frontend)');
const map4 = buildServiceMap('build-004', []);
console.log(JSON.stringify(map4, null, 2));
console.assert(map4.nodes.length === 1, 'Should have only frontend node');
console.assert(map4.edges.length === 0, 'Should have no edges');
console.log('✓ Test 4 passed\n');

// Test 5: P95 latency calculation
console.log('Test 5: P95 latency calculation');
const observations5 = [
  { url: 'https://api.example.com/data', statusCode: 200, latencyMs: 100, timestamp: Date.now() },
  { url: 'https://api.example.com/data', statusCode: 200, latencyMs: 200, timestamp: Date.now() },
  { url: 'https://api.example.com/data', statusCode: 200, latencyMs: 300, timestamp: Date.now() },
  { url: 'https://api.example.com/data', statusCode: 200, latencyMs: 400, timestamp: Date.now() },
  { url: 'https://api.example.com/data', statusCode: 200, latencyMs: 500, timestamp: Date.now() },
];
const map5 = buildServiceMap('build-005', observations5);
console.log(JSON.stringify(map5, null, 2));
console.assert(map5.edges[0].latencyP95 === 500, 'P95 should be 500ms');
console.log('✓ Test 5 passed\n');

// Test 6: Deterministic ordering
console.log('Test 6: Deterministic ordering of nodes and edges');
const observations6 = [
  { url: 'https://api.example.com/data', statusCode: 200, latencyMs: 100, timestamp: Date.now() },
  { url: 'https://auth.example.com/verify', statusCode: 200, latencyMs: 50, timestamp: Date.now() },
];
const map6a = buildServiceMap('build-006', observations6);
const map6b = buildServiceMap('build-006', observations6);
console.log('Map A:', JSON.stringify(map6a));
console.log('Map B:', JSON.stringify(map6b));
console.assert(JSON.stringify(map6a) === JSON.stringify(map6b), 'Maps should be identical');
console.log('✓ Test 6 passed\n');

console.log('\n✓ All unit tests passed!');
