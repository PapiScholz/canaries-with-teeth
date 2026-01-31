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
