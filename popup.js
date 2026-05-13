const port = chrome.runtime.connect({ name: 'popup' });
let updateInterval;
let currentSort = 'timeDesc';

document.getElementById('sortSelect').addEventListener('change', (e) => {
  currentSort = e.target.value;
  renderUI();
});

async function fetchState() {
  const data = await chrome.storage.session.get('sessionState');
  return data.sessionState || { 
    totals: {}, 
    activeDomain: null, 
    isIdle: false, 
    windowFocused: true, 
    isActiveTabAudible: false, 
    lastTimestamp: Date.now(),
    sessionStartTime: Date.now()
  };
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
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

  document.getElementById('totalTime').innerText = formatTime(totalSessionSeconds);

  // Format session start time
  const startTime = new Date(state.sessionStartTime || now);
  document.getElementById('sessionStart').innerText = `INIT: ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;

  const activeContainer = document.getElementById('activeIndicator');

  if (isEffectivelyActive) {
    document.getElementById('activeDomain').innerText = state.activeDomain;
    document.getElementById('activeDomain').style.color = 'var(--neon-cyan)';
    document.getElementById('activeTime').innerText = formatTime(totals[state.activeDomain] || 0);
  } else {
    // If tracking is paused or looking at an internal page
    if (state.activeDomain) {
      document.getElementById('activeDomain').innerText = `${state.activeDomain} [PAUSED]`;
      document.getElementById('activeDomain').style.color = 'var(--text-muted)';
      document.getElementById('activeTime').innerText = formatTime(totals[state.activeDomain] || 0);
    } else {
      document.getElementById('activeDomain').innerText = `[UNTRACKED]`;
      document.getElementById('activeDomain').style.color = 'var(--text-muted)';
      document.getElementById('activeTime').innerText = `-`;
    }
  }

  // Handle sorting
  let sortedDomains = Object.keys(totals);
  if (currentSort === 'timeDesc') {
    sortedDomains.sort((a, b) => totals[b] - totals[a]);
  } else if (currentSort === 'timeAsc') {
    sortedDomains.sort((a, b) => totals[a] - totals[b]);
  } else if (currentSort === 'alpha') {
    sortedDomains.sort((a, b) => a.localeCompare(b));
  }

  // The progress bar percentages should always be relative to the max time in the whole session
  const maxTime = Math.max(...Object.values(totals), 1);

  const statsContainer = document.getElementById('statsContainer');
  
  if (sortedDomains.length === 0) {
    statsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 20px 0;">[ NO_DATA_DETECTED ]</div>';
    return;
  }

  // Remove the empty message if it exists
  if (statsContainer.querySelector('div[style*="text-align: center"]')) {
    statsContainer.innerHTML = '';
  }

  sortedDomains.forEach((domain, index) => {
    const time = totals[domain];
    const percentage = Math.max((time / maxTime) * 100, 2);
    
    let statItem = document.getElementById(`domain-${domain}`);
    
    if (!statItem) {
      statItem = document.createElement('div');
      statItem.className = 'stat-item';
      statItem.id = `domain-${domain}`;
      statItem.innerHTML = `
        <div class="stat-header">
          <span class="stat-domain">${domain}</span>
          <span class="stat-time" id="time-${domain}">${formatTime(time)}</span>
        </div>
        <div class="stat-bar-bg">
          <div class="stat-bar-fill" id="bar-${domain}" style="width: 0%"></div>
        </div>
      `;
      statsContainer.appendChild(statItem);
      
      // Trigger reflow to ensure the transition animates from 0
      void statItem.offsetWidth;
    }
    
    // Update data
    document.getElementById(`time-${domain}`).innerText = formatTime(time);
    document.getElementById(`bar-${domain}`).style.width = `${percentage}%`;
    
    // Ensure correct ordering
    if (statsContainer.children[index] !== statItem) {
      statsContainer.insertBefore(statItem, statsContainer.children[index]);
    }
  });
  
  // Remove missing domains
  Array.from(statsContainer.children).forEach(child => {
    const childDomain = child.id.replace('domain-', '');
    if (totals[childDomain] === undefined && child.className === 'stat-item') {
      child.remove();
    }
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
