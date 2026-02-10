function renderDashboard(report) {
  document.getElementById('dashboard-title').textContent = report.title || 'Canary Dashboard';
  // Canary status
  const status = report.status || 'UNKNOWN';
  document.getElementById('status-section').innerHTML = `<h2>Status: <span class="${status.toLowerCase()}">${status}</span></h2>`;
  // Risk score (last 7 days)
  if (Array.isArray(report.riskScoreHistory)) {
    document.getElementById('risk-section').innerHTML = `<h3>Risk Score (7 days)</h3><div>${report.riskScoreHistory.map((r, i) => `<div>Day ${i+1}: <b>${r}</b></div>`).join('')}</div>`;
  } else {
    document.getElementById('risk-section').innerHTML = '';
  }
  // Blocking reasons
  if (Array.isArray(report.blockingReasons) && report.blockingReasons.length) {
    document.getElementById('reasons-section').innerHTML = `<h3>Blocking Reasons</h3><ul>${report.blockingReasons.map(r => `<li>${r}</li>`).join('')}</ul>`;
  } else {
    document.getElementById('reasons-section').innerHTML = '';
  }
  // Recent runs
  if (Array.isArray(report.recentRuns) && report.recentRuns.length) {
    document.getElementById('recent-section').innerHTML = `<h3>Recent Runs</h3><ul>${report.recentRuns.map(run => `<li>${run}</li>`).join('')}</ul>`;
  } else {
    document.getElementById('recent-section').innerHTML = '';
  }
  // Service Map
  if (report.serviceMap && report.serviceMap.nodes && report.serviceMap.edges) {
    renderServiceMap(report.serviceMap);
  } else {
    document.getElementById('service-map-section').innerHTML = '';
  }
  // Service Map Diff
  if (report.serviceMapDiff) {
    renderServiceMapDiff(report.serviceMapDiff);
  } else {
    document.getElementById('service-map-diff-section').innerHTML = '';
  }
}

function renderServiceMap(serviceMap) {
  const section = document.getElementById('service-map-section');
  const { nodes, edges } = serviceMap;
  
  if (!nodes || nodes.length === 0) {
    section.innerHTML = '';
    return;
  }
  
  // Build adjacency map for tree traversal
  const edgesByFrom = new Map();
  edges.forEach(edge => {
    if (!edgesByFrom.has(edge.from)) {
      edgesByFrom.set(edge.from, []);
    }
    edgesByFrom.get(edge.from).push(edge);
  });
  
  // Find root nodes (nodes that have outgoing edges but are not targets of other nodes)
  const allTargets = new Set(edges.map(e => e.to));
  const roots = nodes.filter(n => !allTargets.has(n.id) || n.type === 'frontend');
  
  let html = '<h3>Service Architecture Map</h3>';
  html += '<div class="service-map-tree">';
  
  if (roots.length > 0) {
    for (const root of roots) {
      html += renderServiceNode(root, edgesByFrom, new Set());
    }
  } else {
    html += '<p>No service topology detected</p>';
  }
  
  html += '</div>';
  section.innerHTML = html;
  
  // Add styles if not already present
  if (!document.getElementById('service-map-styles')) {
    const style = document.createElement('style');
    style.id = 'service-map-styles';
    style.textContent = `
      .service-map-tree {
        font-family: monospace;
        margin: 10px 0;
        border-left: 1px solid #ddd;
        padding-left: 10px;
      }
      .service-node {
        margin: 5px 0;
        padding: 5px;
        background: #f5f5f5;
        border-left: 3px solid #0066cc;
        cursor: pointer;
      }
      .service-node.service { border-left-color: #0066cc; }
      .service-node.frontend { border-left-color: #00cc66; }
      .service-node.function { border-left-color: #cc6600; }
      .service-node-header {
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .service-node-expander {
        margin-right: 8px;
        user-select: none;
      }
      .service-node-details {
        margin-top: 8px;
        font-size: 0.9em;
        color: #555;
        display: none;
      }
      .service-node-details.expanded {
        display: block;
      }
      .service-edges {
        margin-left: 20px;
        margin-top: 5px;
      }
      .service-edge {
        margin: 3px 0;
        padding: 3px;
        background: #efefef;
        border-left: 2px solid #999;
        font-size: 0.85em;
      }
      .edge-high-latency { background: #fff3cd; border-left-color: #ff9800; }
      .edge-error { background: #f8d7da; border-left-color: #dc3545; }
    `;
    document.head.appendChild(style);
  }
}

function renderServiceMapDiff(diff) {
  const section = document.getElementById('service-map-diff-section');
  
  if (!diff || (!diff.addedNodes?.length && !diff.removedNodes?.length && 
      !diff.addedEdges?.length && !diff.removedEdges?.length && !diff.changedEdges?.length)) {
    section.innerHTML = '<h3>Architecture Changes</h3><p><i>No changes detected or no baseline available</i></p>';
    return;
  }
  
  let html = '<h3>Architecture Changes</h3>';
  html += '<div class="service-map-diff">';
  
  // Added nodes
  if (diff.addedNodes?.length > 0) {
    html += '<div class="diff-section added-section">';
    html += '<h4>✚ Added Nodes</h4>';
    html += '<ul>';
    for (const node of diff.addedNodes) {
      html += `<li><span class="node-type-badge ${node.type}">${node.type}</span> ${node.id}</li>`;
    }
    html += '</ul></div>';
  }
  
  // Removed nodes
  if (diff.removedNodes?.length > 0) {
    html += '<div class="diff-section removed-section">';
    html += '<h4>✕ Removed Nodes</h4>';
    html += '<ul>';
    for (const node of diff.removedNodes) {
      html += `<li><span class="node-type-badge ${node.type}">${node.type}</span> ${node.id}</li>`;
    }
    html += '</ul></div>';
  }
  
  // Added edges
  if (diff.addedEdges?.length > 0) {
    html += '<div class="diff-section added-section">';
    html += '<h4>✚ Added Edges</h4>';
    html += '<ul>';
    for (const edge of diff.addedEdges) {
      const hasError = edge.errorRate > 0;
      html += `<li><b>${edge.from}</b> → <b>${edge.to}</b>: `;
      html += `<span title="P95 Latency">⏱ ${edge.latencyP95}ms</span>`;
      if (hasError) {
        html += ` <span title="Error Rate" style="color: #dc3545;">⚠ ${(edge.errorRate * 100).toFixed(1)}%</span>`;
      }
      html += `</li>`;
    }
    html += '</ul></div>';
  }
  
  // Removed edges
  if (diff.removedEdges?.length > 0) {
    html += '<div class="diff-section removed-section">';
    html += '<h4>✕ Removed Edges</h4>';
    html += '<ul>';
    for (const edge of diff.removedEdges) {
      html += `<li><b>${edge.from}</b> → <b>${edge.to}</b>: `;
      html += `<span title="Baseline P95 Latency">⏱ ${edge.baselineLatencyP95}ms</span>`;
      if (edge.baselineErrorRate > 0) {
        html += ` <span title="Baseline Error Rate" style="color: #dc3545;">⚠ ${(edge.baselineErrorRate * 100).toFixed(1)}%</span>`;
      }
      html += `</li>`;
    }
    html += '</ul></div>';
  }
  
  // Changed edges
  if (diff.changedEdges?.length > 0) {
    html += '<div class="diff-section changed-section">';
    html += '<h4>⟳ Changed Edges</h4>';
    html += '<ul>';
    for (const edge of diff.changedEdges) {
      const isSlower = edge.latencyChange > 0;
      const isMoreErrors = edge.errorRateChange > 0;
      html += `<li><b>${edge.from}</b> → <b>${edge.to}</b><br/>`;
      html += `<span style="margin-left: 20px;">`;
      html += `Latency: ${edge.baselineLatencyP95}ms → ${edge.currentLatencyP95}ms `;
      if (isSlower) {
        html += `<span style="color: #ff9800;">+${edge.latencyChange}ms</span>`;
      } else {
        html += `<span style="color: #00cc66;">${edge.latencyChange}ms</span>`;
      }
      html += `<br/>`;
      html += `Errors: ${(edge.baselineErrorRate * 100).toFixed(1)}% → ${(edge.currentErrorRate * 100).toFixed(1)}% `;
      if (isMoreErrors) {
        html += `<span style="color: #dc3545;">+${(edge.errorRateChange * 100).toFixed(1)}%</span>`;
      } else {
        html += `<span style="color: #00cc66;">${(edge.errorRateChange * 100).toFixed(1)}%</span>`;
      }
      html += `</span></li>`;
    }
    html += '</ul></div>';
  }
  
  html += '</div>';
  section.innerHTML = html;
  
  // Add diff-specific styles if not already present
  if (!document.getElementById('service-map-diff-styles')) {
    const style = document.createElement('style');
    style.id = 'service-map-diff-styles';
    style.textContent = `
      .service-map-diff {
        margin: 10px 0;
      }
      .diff-section {
        margin: 10px 0;
        padding: 10px;
        border-left: 4px solid #999;
        background: #f9f9f9;
      }
      .diff-section h4 {
        margin-top: 0;
        margin-bottom: 8px;
      }
      .diff-section.added-section {
        border-left-color: #00cc66;
        background: #f0fff4;
      }
      .diff-section.removed-section {
        border-left-color: #dc3545;
        background: #fff5f5;
      }
      .diff-section.changed-section {
        border-left-color: #ff9800;
        background: #fffaf0;
      }
      .diff-section ul {
        margin: 5px 0;
        padding-left: 20px;
      }
      .diff-section li {
        margin: 5px 0;
        line-height: 1.6;
      }
      .node-type-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.7em;
        font-weight: bold;
        margin-right: 8px;
        color: white;
      }
      .node-type-badge.frontend {
        background: #00cc66;
      }
      .node-type-badge.service {
        background: #0066cc;
      }
      .node-type-badge.function {
        background: #cc6600;
      }
    `;
    document.head.appendChild(style);
  }
}

function renderServiceNode(node, edgesByFrom, visited) {
  if (visited.has(node.id)) {
    return ''; // Prevent cycles
  }
  visited.add(node.id);
  
  const edges = edgesByFrom.get(node.id) || [];
  const hasChildren = edges.length > 0;
  
  let html = `<div class="service-node ${node.type}">`;
  html += `<div class="service-node-header">`;
  
  if (hasChildren) {
    html += `<span class="service-node-expander" onclick="toggleNodeDetails(event)">▶</span>`;
  } else {
    html += `<span class="service-node-expander">•</span>`;
  }
  
  html += `<span>${node.id}</span>`;
  html += `<span style="font-size: 0.8em; color: #999; margin-left: 10px;">[${node.type}]</span>`;
  html += `</div>`;
  
  if (hasChildren) {
    html += `<div class="service-node-details${hasChildren ? ' expanded' : ''}">`;
    html += '<div class="service-edges">';
    
    for (const edge of edges) {
      const isHighLatency = edge.latencyP95 > 1000;
      const hasError = edge.errorRate > 0;
      let edgeClass = 'service-edge';
      if (isHighLatency) edgeClass += ' edge-high-latency';
      if (hasError) edgeClass += ' edge-error';
      
      html += `<div class="${edgeClass}">`;
      html += `→ <b>${edge.to}</b>: `;
      html += `<span title="P95 Latency">⏱ ${edge.latencyP95}ms</span>`;
      if (hasError) {
        html += ` <span title="Error Rate" style="color: #dc3545;">⚠ ${(edge.errorRate * 100).toFixed(1)}%</span>`;
      }
      html += `</div>`;
    }
    
    html += '</div>';
    html += '</div>';
  }
  
  html += '</div>';
  
  return html;
}

function toggleNodeDetails(event) {
  event.stopPropagation();
  const header = event.target.parentElement;
  const details = header.nextElementSibling;
  if (details && details.classList.contains('service-node-details')) {
    details.classList.toggle('expanded');
    event.target.textContent = details.classList.contains('expanded') ? '▼' : '▶';
  }
}

function tryLoadEmbedded() {
  const embedded = document.getElementById('embeddedReport');
  if (embedded) {
    try {
      const report = JSON.parse(embedded.textContent);
      renderDashboard(report);
      return true;
    } catch {}
  }
  return false;
}

function tryFetchReport() {
  fetch('./report.json').then(r => r.json()).then(report => {
    renderDashboard(report);
  }).catch(() => {
    document.getElementById('file-loader').style.display = 'block';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!tryLoadEmbedded()) {
    tryFetchReport();
  }
  document.getElementById('fileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const report = JSON.parse(evt.target.result);
        renderDashboard(report);
      } catch {
        alert('Invalid JSON');
      }
    };
    reader.readAsText(file);
  });
});
