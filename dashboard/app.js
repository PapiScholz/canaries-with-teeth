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
