let sessionState = {
  activeDomain: null,
  lastTimestamp: Date.now(),
  sessionStartTime: Date.now(),
  totals: {},
  isIdle: false,
  windowFocused: true,
  isActiveTabAudible: false
};

const IDLE_DETECTION_INTERVAL = 60; // 60 seconds

let isInitialized = false;
let initPromise = loadState();

async function loadState() {
  const data = await chrome.storage.session.get('sessionState');
  if (data.sessionState) {
    sessionState = data.sessionState;
    if (!sessionState.sessionStartTime) sessionState.sessionStartTime = Date.now();
    await _processStateChange();
  } else {
    chrome.idle.setDetectionInterval(IDLE_DETECTION_INTERVAL);
    sessionState.lastTimestamp = Date.now();
    await _processStateChange();
  }
  isInitialized = true;
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

async function processStateChange(updates = {}) {
  if (!isInitialized) await initPromise;
  return _processStateChange(updates);
}

async function _processStateChange(updates = {}) {
  const now = Date.now();
  
  // 1. Calculate and aggregate elapsed time using PREVIOUS state
  const wasEffectivelyActive = sessionState.activeDomain && 
                               (sessionState.windowFocused || isPopupOpen) && 
                               (!sessionState.isIdle || sessionState.isActiveTabAudible);

  if (wasEffectivelyActive) {
    const elapsedSeconds = Math.floor((now - sessionState.lastTimestamp) / 1000);
    
    // Safety limit: if elapsed time is unrealistically large (> 24 hours), ignore it
    if (elapsedSeconds > 0 && elapsedSeconds < 86400) {
      if (!sessionState.totals[sessionState.activeDomain]) {
        sessionState.totals[sessionState.activeDomain] = 0;
      }
      sessionState.totals[sessionState.activeDomain] += elapsedSeconds;
    }
  }

  // 2. Apply state updates from the event BEFORE determining the new domain
  if (updates.windowFocused !== undefined) {
    sessionState.windowFocused = updates.windowFocused;
  }
  if (updates.isIdle !== undefined) {
    sessionState.isIdle = updates.isIdle;
  }

  // 3. Determine new active domain and audible state safely
  let newDomain = sessionState.activeDomain; // Prevent false wipes if query fails
  let newAudible = sessionState.isActiveTabAudible;
  
  try {
    // Get the last focused normal window (ignores extension popups)
    const window = await chrome.windows.getLastFocused({ populate: true, windowTypes: ['normal'] });
    if (window && window.tabs) {
      const activeTab = window.tabs.find(t => t.active);
      if (activeTab) {
        if (!activeTab.incognito) {
          newAudible = activeTab.audible || false;
          newDomain = getDomain(activeTab.url);
        } else {
          newDomain = null;
        }
      }
    }
  } catch (e) {
    console.error("Error querying windows:", e);
  }

  // 4. Update state
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

let isPopupOpen = false;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    isPopupOpen = true;
    processStateChange();
    
    port.onDisconnect.addListener(() => {
      isPopupOpen = false;
      processStateChange();
    });
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  const isFocused = (windowId !== chrome.windows.WINDOW_ID_NONE);
  processStateChange({ windowFocused: isFocused });
});

chrome.idle.onStateChanged.addListener((newState) => {
  const isIdle = (newState !== 'active');
  processStateChange({ isIdle: isIdle });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reset_session') {
    sessionState.totals = {};
    sessionState.lastTimestamp = Date.now();
    sessionState.sessionStartTime = Date.now();
    saveState().then(() => sendResponse({success: true}));
    return true; // indicates async response
  }
});
