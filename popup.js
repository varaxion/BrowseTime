let updateInterval;

async function fetchState() {
  const data = await chrome.storage.session.get('sessionState');
  return data.sessionState || { totals: {}, activeDomain: null, isIdle: false, windowFocused: true, isActiveTabAudible: false, lastTimestamp: Date.now() };
}

function formatLiveTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatStatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `< 1m`;
}

async function renderUI() {
  const state = await fetchState();
  const now = Date.now();
  
  const totals = { ...state.totals };
  
  let activeElapsed = 0;
  const isEffectivelyActive = state.activeDomain && state.windowFocused && (!state.isIdle || state.isActiveTabAudible);
  
  if (isEffectivelyActive) {
    activeElapsed = Math.floor((now - state.lastTimestamp) / 1000);
    totals[state.activeDomain] = (totals[state.activeDomain] || 0) + activeElapsed;
  }

  let totalSessionSeconds = 0;
  for (const domain in totals) {
    totalSessionSeconds += totals[domain];
  }

  document.getElementById('totalTime').innerText = formatStatTime(totalSessionSeconds);

  const activeContainer = document.getElementById('activeIndicator');
  if (isEffectivelyActive) {
    activeContainer.style.display = 'flex';
    document.getElementById('activeDomain').innerText = state.activeDomain;
    document.getElementById('activeTime').innerText = formatLiveTime(totals[state.activeDomain] || 0);
  } else {
    activeContainer.style.display = 'none';
  }

  const sortedDomains = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  const maxTime = sortedDomains.length > 0 ? totals[sortedDomains[0]] : 1;

  const statsContainer = document.getElementById('statsContainer');
  statsContainer.innerHTML = '';
  
  if (sortedDomains.length === 0) {
    statsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px 0;">No active browsing yet.</div>';
  }

  sortedDomains.forEach(domain => {
    const time = totals[domain];
    const percentage = Math.max((time / maxTime) * 100, 2);
    
    const statItem = document.createElement('div');
    statItem.className = 'stat-item';
    
    statItem.innerHTML = `
      <div class="stat-header">
        <span class="stat-domain">${domain}</span>
        <span class="stat-time">${formatStatTime(time)}</span>
      </div>
      <div class="stat-bar-bg">
        <div class="stat-bar-fill" style="width: ${percentage}%"></div>
      </div>
    `;
    statsContainer.appendChild(statItem);
  });
}

document.getElementById('resetBtn').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'reset_session' });
  renderUI();
});

// Initial render
renderUI();

// Live ticker to update active time every second
updateInterval = setInterval(renderUI, 1000);
