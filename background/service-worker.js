// ==========================================================================
// SpeedShield - Background Service Worker (Manifest V3)
// Autonomous Auto-Updater, DNR Dynamic Rules Engine, Stats & Whitelist
// ==========================================================================

const DEFAULT_UPDATE_INTERVAL_MINUTES = 240; // Auto-updates every 4 hours automatically
const DYNAMIC_RULE_START_ID = 10000;
const MAX_DYNAMIC_RULES = 5000;
const STATIC_RULESET_IDS = ['ruleset_ad_servers', 'ruleset_trackers', 'ruleset_popups'];

// Curated live threat, malware, virus, tracker, and ad feeds for autonomous updates
const REMOTE_RULE_SOURCES = [
  'https://urlhaus.abuse.ch/downloads/hostfile/',
  'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml&showintro=0&mimetype=plaintext',
  'https://adaway.org/hosts.txt',
  'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts'
];

// Curated modern cosmetic selectors for new banner formats and ad types
const MODERN_COSMETIC_SELECTORS = [
  'ins.adsbygoogle',
  '[id^="google_ads_"]',
  '[id^="div-gpt-ad"]',
  '[id^="ad-gpt-"]',
  '[class*="sponsored-post"]',
  '[class*="sponsored-card"]',
  '[class*="sponsored-label"]',
  '[class*="native-ad"]',
  '[class^="ad-banner"]',
  '[class^="ad-placement"]',
  '[class^="ad-container"]',
  '[class*=" ad-container"]',
  '[class*="-ad-container"]',
  '[class^="ad-wrapper"]',
  '[id^="ad-container"]',
  '[id*="-ad-container"]',
  '[id^="ad-wrapper"]',
  'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
  'ytd-rich-item-renderer:has([id*="ad-slot"])',
  'ytd-ad-slot-renderer',
  'ytd-in-feed-ad-layout-renderer',
  '.taboola',
  '.trc_rbox_div',
  '.trc_related_container',
  '.outbrain',
  '.ob-widget',
  '.revcontent',
  '.mgid-widget',
  '.zergnet-widget',
  'iframe[id^="google_ads_frame"]',
  'iframe[id^="aswift_"]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="adnxs.com"]',
  '.fc-ab-root',
  '.adblock-overlay',
  '#adblock-notice',
  '.sp_veil',
  '.sp_message_container',
  '[class*="adblock-modal"]',
  '.ytp-ad-overlay-container',
  '.ytp-ad-message-container',
  '.ytp-ad-player-overlay',
  '#player-ads',
  'ytd-promoted-sparkles-web-renderer',
  'ytd-banner-promo-renderer',
  'shreddit-ad-post',
  '[data-testid="ad-post"]',
  'shreddit-comment-tree-ad',
  '.promotedlink',
  '.promoted',
  'aside[aria-label="Advertisement"]',
  '#advertisement-container',
  'reddit-sidebar-ad',
  '.stream-display-ad__wrapper',
  '.tw-ad-container',
  '[data-a-target="video-ad-countdown"]',
  '[data-a-target="video-ad-label"]',
  '[data-a-target="video-ad-text"]',
  '[data-a-target="ax-overlay"]',
  '[data-test-selector="sad-overlay"]',
  '[data-a-target="player-overlay-ad"]',
  '[data-test-selector="ad-banner-default-text"]',
  'div[data-a-target="sponsored-stream"]',
  '.tw-premium-banner',
  '[data-a-target="side-nav-ad"]',
  'iframe[src*="amazon-adsystem"]'
];

// Per-tab blocked request tracker
const tabBlockedCounts = new Map();

// Initialize on install or startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[SpeedShield] Installed/Updated:', details.reason);
  await initializeStorage();
  await setupAlarm();
  await syncWhitelistRules();
  // Autonomous initial background update
  checkAndPerformUpdate(false).catch(() => {});
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[SpeedShield] Browser started. Ensuring auto-updater is active...');
  await setupAlarm();
  await syncWhitelistRules();

  // If last update was > 4 hours ago, auto-update immediately in background
  const data = await chrome.storage.local.get(['last_updated', 'update_interval_minutes']);
  const intervalMs = (data.update_interval_minutes || DEFAULT_UPDATE_INTERVAL_MINUTES) * 60 * 1000;
  if (!data.last_updated || (Date.now() - data.last_updated) > intervalMs) {
    console.log('[SpeedShield] Running scheduled auto-update on startup...');
    checkAndPerformUpdate(false).catch(() => {});
  }
});

// Periodic Alarm Listener for Autonomous Updates
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'speedshield_rule_update') {
    console.log('[SpeedShield] Autonomous 4-hour background update alarm triggered.');
    checkAndPerformUpdate(false).catch(() => {});
  }
});

async function initializeStorage() {
  const data = await chrome.storage.local.get([
    'shield_enabled',
    'whitelist',
    'total_blocked',
    'last_updated',
    'dynamic_rules_count',
    'update_interval_minutes',
    'dynamic_cosmetic_selectors',
    'custom_blocked_domains'
  ]);

  const defaults = {};
  if (data.shield_enabled === undefined) defaults.shield_enabled = true;
  if (!data.whitelist) defaults.whitelist = [];
  if (data.total_blocked === undefined) defaults.total_blocked = 0;
  if (!data.last_updated) defaults.last_updated = Date.now();
  if (data.dynamic_rules_count === undefined) defaults.dynamic_rules_count = 0;
  if (!data.update_interval_minutes) defaults.update_interval_minutes = DEFAULT_UPDATE_INTERVAL_MINUTES;
  defaults.dynamic_cosmetic_selectors = MODERN_COSMETIC_SELECTORS;
  if (!data.custom_blocked_domains) defaults.custom_blocked_domains = [];

  if (Object.keys(defaults).length > 0) {
    await chrome.storage.local.set(defaults);
  }
}

async function setupAlarm() {
  const data = await chrome.storage.local.get(['update_interval_minutes']);
  const interval = data.update_interval_minutes || DEFAULT_UPDATE_INTERVAL_MINUTES;

  chrome.alarms.get('speedshield_rule_update', (existingAlarm) => {
    if (!existingAlarm || existingAlarm.periodInMinutes !== interval) {
      chrome.alarms.create('speedshield_rule_update', {
        periodInMinutes: interval
      });
      console.log(`[SpeedShield] Autonomous auto-updater active: runs every ${interval} minutes.`);
    }
  });
}

// Update Extension Toolbar Badge
function updateBadge(tabId, count) {
  if (!tabId || tabId < 0) return;
  const countStr = count > 0 ? (count > 999 ? '999+' : String(count)) : '';
  try {
    chrome.action.setBadgeText({ tabId, text: countStr }, () => {
      if (chrome.runtime.lastError) {} // Ignore if tab closed
    });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#00b4d8' }, () => {
      if (chrome.runtime.lastError) {}
    });
  } catch (e) {}
}

// Track blocked requests via DNR Feedback if available
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const tabId = info.request.tabId;
    if (tabId && tabId > 0) {
      incrementTabCount(tabId, 1);
    }
  });
}

let pendingBlockedIncrements = 0;
let flushStorageTimer = null;

function incrementTabCount(tabId, amount = 1) {
  const current = tabBlockedCounts.get(tabId) || 0;
  const updated = current + amount;
  tabBlockedCounts.set(tabId, updated);
  updateBadge(tabId, updated);

  pendingBlockedIncrements += amount;
  if (!flushStorageTimer) {
    flushStorageTimer = setTimeout(() => {
      flushStorageTimer = null;
      const inc = pendingBlockedIncrements;
      pendingBlockedIncrements = 0;
      chrome.storage.local.get(['total_blocked'], (res) => {
        const total = (res.total_blocked || 0) + inc;
        chrome.storage.local.set({ total_blocked: total });
      });
    }, 1500);
  }
}

// Clean up tab stats when closed or navigated
chrome.tabs.onRemoved.addListener((tabId) => {
  tabBlockedCounts.delete(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'loading' || changeInfo.url) {
    tabBlockedCounts.set(tabId, 0);
    updateBadge(tabId, 0);

    // Liveness check: If more than update interval elapsed, trigger auto-update silently
    const data = await chrome.storage.local.get(['last_updated', 'update_interval_minutes']);
    const intervalMs = (data.update_interval_minutes || DEFAULT_UPDATE_INTERVAL_MINUTES) * 60 * 1000;
    if (data.last_updated && (Date.now() - data.last_updated) > intervalMs) {
      checkAndPerformUpdate(false).catch(() => {});
    }
  }
});

// Synchronize Whitelist rules and master shield state
async function syncWhitelistRules() {
  const { whitelist = [], shield_enabled = true } = await chrome.storage.local.get(['whitelist', 'shield_enabled']);
  
  // 1. Toggle Static Rulesets
  try {
    if (!shield_enabled) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: STATIC_RULESET_IDS
      });
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: STATIC_RULESET_IDS
      });
    }
  } catch (err) {
    console.warn('[SpeedShield] Ruleset state sync notice:', err.message);
  }

  // 2. Clear old session rules
  const existingRules = await chrome.declarativeNetRequest.getSessionRules();
  const removeRuleIds = existingRules.map(r => r.id);
  const addRules = [];

  // 3. If whitelisted sites exist and shield is on, allow requests for those domains
  if (shield_enabled && whitelist.length > 0) {
    let sessionRuleId = 90000;
    for (const domain of whitelist) {
      if (!domain) continue;

      // Allow frames navigating to whitelisted domain
      addRules.push({
        id: sessionRuleId++,
        priority: 100,
        action: { type: 'allowAllRequests' },
        condition: {
          requestDomains: [domain],
          resourceTypes: ['main_frame', 'sub_frame']
        }
      });

      // Allow frames initiated by whitelisted domain
      addRules.push({
        id: sessionRuleId++,
        priority: 100,
        action: { type: 'allowAllRequests' },
        condition: {
          initiatorDomains: [domain],
          resourceTypes: ['main_frame', 'sub_frame']
        }
      });

      // Allow all subresources requested by this domain
      addRules.push({
        id: sessionRuleId++,
        priority: 100,
        action: { type: 'allow' },
        condition: {
          initiatorDomains: [domain],
          urlFilter: '*'
        }
      });
    }
  }

  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds,
      addRules
    });
  } catch (err) {
    console.error('[SpeedShield] Error updating session rules:', err.message);
  }
}

// Autonomous Filter Update Engine
async function checkAndPerformUpdate(forced = false) {
  console.log('[SpeedShield] Auto-updating ad, tracker, malware, and virus filter definitions...');
  let fetchedDomains = new Set();

  for (const url of REMOTE_RULE_SOURCES) {
    if (fetchedDomains.size >= MAX_DYNAMIC_RULES) break;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per feed
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        const lines = text.split('\n');
        let fromThisFeed = 0;

        for (let line of lines) {
          line = line.trim();
          if (!line || line.startsWith('#') || line.startsWith('!')) continue;

          // Parse hosts format: "0.0.0.0 domain.com" or "127.0.0.1 domain.com" or plain domain
          const parts = line.split(/\s+/);
          let domain = '';
          if (parts.length >= 2 && (parts[0] === '0.0.0.0' || parts[0] === '127.0.0.1')) {
            domain = parts[1].trim().toLowerCase();
          } else if (parts.length === 1 && !line.includes(' ')) {
            domain = parts[0].trim().toLowerCase();
          }

          // Validate domain format: strict RFC compliant domain labels
          if (domain && domain !== 'localhost' && domain.includes('.') && !domain.startsWith('.')) {
            domain = domain.replace(/[\^$|]/g, '');
            if (/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(domain)) {
              if (!fetchedDomains.has(domain)) {
                fetchedDomains.add(domain);
                fromThisFeed++;
              }
            }
          }

          // Cap at MAX_DYNAMIC_RULES to keep DNR blazing fast
          if (fetchedDomains.size >= MAX_DYNAMIC_RULES) break;
        }

        console.log(`[SpeedShield] Live feed retrieved ${fromThisFeed} domains from ${url} (Total active: ${fetchedDomains.size})`);
      }
    } catch (err) {
      console.warn(`[SpeedShield] Source feed notice (${url}):`, err.message);
    }
  }

  // Include user custom blocked domains
  try {
    const storageData = await chrome.storage.local.get(['custom_blocked_domains']);
    const customDomains = storageData.custom_blocked_domains || [];
    for (const d of customDomains) {
      if (d && d.trim()) fetchedDomains.add(d.trim().toLowerCase());
    }
  } catch (e) {}

  if (fetchedDomains.size > 0) {
    // Convert to DeclarativeNetRequest dynamic rules
    const newRules = [];
    let ruleId = DYNAMIC_RULE_START_ID;

    for (const domain of fetchedDomains) {
      newRules.push({
        id: ruleId++,
        priority: 2,
        action: { type: 'block' },
        condition: {
          urlFilter: '||' + domain + '^',
          resourceTypes: [
            'sub_frame', 'stylesheet', 'script', 'image', 'font',
            'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other'
          ]
        }
      });
    }

    // Safely replace existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: newRules
    });

    const now = Date.now();
    await chrome.storage.local.set({
      last_updated: now,
      dynamic_rules_count: newRules.length,
      dynamic_cosmetic_selectors: MODERN_COSMETIC_SELECTORS
    });

    console.log(`[SpeedShield] Auto-update complete: ${newRules.length} dynamic ad/tracker rules active.`);
    return { success: true, count: newRules.length, timestamp: now };
  } else {
    console.log('[SpeedShield] Network offline or feed unchanged; retaining active filter set.');
    const stored = await chrome.storage.local.get(['dynamic_rules_count', 'last_updated']);
    return {
      success: true,
      count: stored.dynamic_rules_count || 0,
      timestamp: stored.last_updated || Date.now()
    };
  }
}

// Runtime Message Handling (from Popup, Options, Content Scripts)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'report_cosmetic_blocks') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId && tabId > 0) {
      incrementTabCount(tabId, message.count || 1);
    }
    sendResponse({ status: 'ok' });
    return true;
  }

  if (message.action === 'get_tab_stats') {
    const tabId = message.tabId;
    const count = tabBlockedCounts.get(tabId) || 0;
    chrome.storage.local.get(
      ['shield_enabled', 'whitelist', 'total_blocked', 'last_updated', 'dynamic_rules_count', 'update_interval_minutes'],
      (data) => {
        sendResponse({
          tabBlocked: count,
          totalBlocked: data.total_blocked || 0,
          shieldEnabled: data.shield_enabled !== false,
          whitelist: data.whitelist || [],
          lastUpdated: data.last_updated || Date.now(),
          dynamicCount: data.dynamic_rules_count || 0,
          updateInterval: data.update_interval_minutes || DEFAULT_UPDATE_INTERVAL_MINUTES
        });
      }
    );
    return true;
  }

  if (message.action === 'toggle_shield') {
    chrome.storage.local.get(['shield_enabled'], async (data) => {
      const newState = !data.shield_enabled;
      await chrome.storage.local.set({ shield_enabled: newState });
      await syncWhitelistRules();
      sendResponse({ shieldEnabled: newState });
    });
    return true;
  }

  if (message.action === 'toggle_whitelist') {
    const domain = (message.domain || '').toLowerCase();
    chrome.storage.local.get(['whitelist'], async (data) => {
      let whitelist = data.whitelist || [];
      const index = whitelist.indexOf(domain);
      let isWhitelisted = false;

      if (index >= 0) {
        whitelist.splice(index, 1);
      } else {
        whitelist.push(domain);
        isWhitelisted = true;
      }

      await chrome.storage.local.set({ whitelist });
      await syncWhitelistRules();
      sendResponse({ whitelist, isWhitelisted });
    });
    return true;
  }

  if (message.action === 'force_update_rules') {
    checkAndPerformUpdate(true).then((result) => {
      sendResponse(result);
    }).catch((err) => {
      sendResponse({ success: false, reason: err.message });
    });
    return true;
  }
});
