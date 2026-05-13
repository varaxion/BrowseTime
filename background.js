// State structure
let sessionState = {
  activeDomain: null,
  lastTimestamp: Date.now(),
  totals: {},
  isIdle: false,
  windowFocused: true,
  isActiveTabAudible: false
};

const IDLE_DETECTION_INTERVAL = 60; // 60 seconds

async function loadState() {
  const data = await chrome.storage.session.get('sessionState');
  if (data.sessionState) {
    sessionState = data.sessionState;
    // Process any time that elapsed while service worker was suspended
    await processStateChange();
  } else {
    // First run
    chrome.idle.setDetectionInterval(IDLE_DETECTION_INTERVAL);
    sessionState.lastTimestamp = Date.now();
    await processStateChange();
  }
}

async function saveState() {
  await chrome.storage.session.set({ sessionState });
}

function getDomain(url) {
  if (!url || (!url.startsWith('http:') && !url.startsWith('https:'))) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
}

async function processStateChange() {
  const now = Date.now();
  
  const isEffectivelyActive = sessionState.activeDomain && 
                              sessionState.windowFocused && 
                              (!sessionState.isIdle || sessionState.isActiveTabAudible);

  // 1. Calculate and aggregate elapsed time
  if (isEffectivelyActive) {
    const elapsedSeconds = Math.floor((now - sessionState.lastTimestamp) / 1000);
    
    // Safety limit: if elapsed time is unrealistically large (> 24 hours), ignore it
    if (elapsedSeconds > 0 && elapsedSeconds < 86400) {
      if (!sessionState.totals[sessionState.activeDomain]) {
        sessionState.totals[sessionState.activeDomain] = 0;
      }
      sessionState.totals[sessionState.activeDomain] += elapsedSeconds;
    }
  }

  // 2. Determine new active domain and audible state
  let newDomain = null;
  let newAudible = false;
  
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && !tabs[0].incognito) {
      newAudible = tabs[0].audible || false;
      
      if (sessionState.windowFocused && (!sessionState.isIdle || newAudible)) {
        newDomain = getDomain(tabs[0].url);
      }
    }
  } catch (e) {
    console.error("Error querying tabs:", e);
  }

  // 3. Update state
  sessionState.activeDomain = newDomain;
  sessionState.isActiveTabAudible = newAudible;
  sessionState.lastTimestamp = now;
  
  await saveState();
}

// Listeners
chrome.tabs.onActivated.addListener(() => processStateChange());

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.url !== undefined || changeInfo.audible !== undefined)) {
    processStateChange();
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    sessionState.windowFocused = false;
  } else {
    sessionState.windowFocused = true;
  }
  processStateChange();
});

chrome.idle.onStateChanged.addListener((newState) => {
  if (newState === 'active') {
    sessionState.isIdle = false;
  } else {
    sessionState.isIdle = true;
  }
  processStateChange();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reset_session') {
    sessionState.totals = {};
    sessionState.lastTimestamp = Date.now();
    saveState().then(() => sendResponse({success: true}));
    return true; // indicates async response
  }
});

// Initialize
loadState();
