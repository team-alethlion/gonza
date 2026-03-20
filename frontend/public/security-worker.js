/**
 * Security Worker
 * Runs in a background thread to monitor subscription validity 
 * without impacting UI performance.
 */

let monitorInterval = null;

self.onmessage = (event) => {
  const { type, payload } = event.data;

  if (type === 'START_MONITOR') {
    startMonitoring(payload);
  } else if (type === 'STOP_MONITOR') {
    stopMonitoring();
  } else if (type === 'UPDATE_USER_DATA') {
    currentUserData = payload;
  } else if (type === 'CHECK_NOW') {
    checkValidity();
  }
};

let currentUserData = null;

function startMonitoring(userData) {
  currentUserData = userData;
  if (monitorInterval) clearInterval(monitorInterval);

  // Run initial check
  checkValidity();

  // Strict 5-second background heartbeat
  monitorInterval = setInterval(() => {
    checkValidity();
  }, 5000);
}

function stopMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

function checkValidity() {
  if (!currentUserData) return;

  const { subStatus, subExpiry, trialEnd, role } = currentUserData;
  const now = Date.now();
  
  // Superadmins skip the background check
  if (role === 'superadmin') return;

  let isValid = false;
  let reason = "";

  const status = subStatus?.toLowerCase();

  switch (status) {
    case 'active':
      if (subExpiry && new Date(subExpiry).getTime() > now) {
        isValid = true;
      } else {
        reason = "SUBSCRIPTION_EXPIRED";
      }
      break;
    case 'trial':
      if (trialEnd && new Date(trialEnd).getTime() > now) {
        isValid = true;
      } else {
        reason = "TRIAL_EXPIRED";
      }
      break;
    case 'expired':
      reason = "EXPLICIT_EXPIRED";
      break;
    case 'blocked':
      reason = "EXPLICIT_BLOCKED";
      break;
    default:
      reason = "INVALID_STATUS";
      break;
  }

  if (!isValid) {
    // Notify the main thread to take action
    self.postMessage({ type: 'SECURITY_VIOLATION', reason });
  }
}
