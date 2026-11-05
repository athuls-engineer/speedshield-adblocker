// ==========================================================================
// SpeedShield - Cosmetic Engine & DOM Cleaner
// Collapses ad slots, purges empty placeholders, defuses anti-adblockers
// YouTube 2-Video Split Mode & Zero-Latency Video Ad Skipper
// ==========================================================================

(function() {
  'use strict';

  if (!chrome.runtime || !chrome.runtime.id) return;

  const currentHost = (window.location.hostname || '').toLowerCase();
  const isCharacterAI = currentHost.includes('character.ai') || currentHost.endsWith('c.ai');
  if (isCharacterAI) {
    return;
  }

  try {
    chrome.storage.local.get([
      'shield_enabled',
      'whitelist',
      'dynamic_cosmetic_selectors',
      'custom_cosmetic_filters',
      'hud_enabled',
      'hud_mode'
    ], (data) => {
      if (chrome.runtime.lastError || !data) return;

      const hostname = (window.location.hostname || '').toLowerCase();
      const whitelist = data.whitelist || [];
      const isWhitelisted = whitelist.some(domain => hostname === domain || hostname.endsWith('.' + domain));
      const shieldEnabled = data.shield_enabled !== false;
      const hudMode = data.hud_mode || (data.hud_enabled === false ? 'never' : 'auto');

      initCosmeticEngine(
        data.dynamic_cosmetic_selectors || [],
        data.custom_cosmetic_filters || [],
        isWhitelisted,
        shieldEnabled,
        hudMode
      );
    });
  } catch (e) {}

  function initCosmeticEngine(dynamicSelectors = [], initialCustomFilters = [], isWhitelisted = false, shieldEnabled = true, hudMode = 'auto') {
    let blockedCount = 0;
    let updateHUDCount = () => {};
    let toggleHUDPanel = () => {};

    const hostname = (window.location.hostname || '').toLowerCase();
    const href = (window.location.href || '').toLowerCase();
    const path = (window.location.pathname || '').toLowerCase();
    const title = (document.title || '').toLowerCase();

    // Security Verification, CAPTCHA & Anti-Bot Pure Passthrough Guard
    if (
      hostname.includes('challenges.cloudflare.com') ||
      hostname.includes('recaptcha') ||
      hostname.includes('hcaptcha') ||
      hostname.includes('turnstile') ||
      href.includes('cf-chl') ||
      href.includes('__cf_chl') ||
      href.includes('turnstile') ||
      path.includes('/cdn-cgi/challenge-platform') ||
      title.includes('just a moment') ||
      title.includes('verifying your request') ||
      title.includes('attention required') ||
      title.includes('security check')
    ) {
      return;
    }

    // Initialize In-Page Floating HUD on top-level pages
    if (window === window.top && hudMode !== 'never') {
      try {
        initInPageHUD(isWhitelisted, shieldEnabled, hostname, hudMode);
      } catch (err) {
        console.warn('[SpeedShield] In-page HUD notice:', err);
      }
    }

    // If extension is globally paused or site is whitelisted, skip ad-blocking DOM filters
    if (isWhitelisted || !shieldEnabled) {
      return;
    }

    const isYouTube = hostname.includes('youtube.com');
    const isTwitch = hostname.includes('twitch.tv');
    const isCharacterAI = hostname.includes('character.ai') || hostname.endsWith('c.ai');

    // Inject dynamic CSS rules for newly auto-updated ad selectors
    if (dynamicSelectors.length > 0) {
      try {
        const style = document.createElement('style');
        style.id = 'speedshield-dynamic-filter-css';
        style.textContent = dynamicSelectors.join(',\n') + ` {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          min-height: 0 !important;
          max-height: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }`;
        (document.head || document.documentElement).appendChild(style);
      } catch (e) {}
    }

    // Report blocked ad elements to background for tab stats
    function reportBlocked(count) {
      if (count <= 0) return;
      blockedCount += count;
      if (typeof updateHUDCount === 'function') {
        updateHUDCount(blockedCount);
      }
      if (!chrome.runtime || !chrome.runtime.id) return;
      try {
        chrome.runtime.sendMessage({
          action: 'report_cosmetic_blocks',
          count: count
        }).catch(() => {});
      } catch (e) {}
    }

    // Base selectors
    const BASE_SELECTORS = [
      'ins.adsbygoogle',
      '[id^="google_ads_"]',
      '[id^="div-gpt-ad"]',
      '[id^="ad-gpt-"]',
      '[class*="sponsored-post"]',
      '[class*="sponsored-card"]',
      '[class*="native-ad"]',
      'shreddit-ad-post',
      '[data-testid="ad-post"]',
      'shreddit-comment-tree-ad',
      '.promotedlink',
      '.promoted',
      'aside[aria-label="Advertisement"]',
      '#advertisement-container',
      'reddit-sidebar-ad',
      '.taboola',
      '.trc_rbox_div',
      '.trc_related_container',
      '.outbrain',
      '.ob-widget',
      '.revcontent',
      '.mgid-widget',
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
      'iframe[src*="amazon-adsystem"]',
      'iframe[id^="google_ads_frame"]',
      'iframe[id^="aswift_"]',
      'iframe[src*="doubleclick.net"]',
      'iframe[src*="googlesyndication.com"]',
      'iframe[src*="adnxs.com"]',
      '.fc-ab-root',
      '.adblock-overlay',
      '#adblock-notice',
      '[class*="cai-plus"]',
      '[class*="plus-offer"]',
      '[class*="promo-banner"]',
      '[class*="banner-ad"]',
      'div[data-testid*="ad-banner"]',
      'a[href*="c.ai/plus"]',
      'a[href*="character.ai/plus"]'
    ];

    const ALL_SELECTORS = Array.from(new Set([...BASE_SELECTORS, ...dynamicSelectors]));
    const AD_SELECTOR_QUERY = ALL_SELECTORS.join(', ');

    // Enforce 2-videos per line on YouTube when in half-split screen
    function adaptYouTubeGrid() {
      if (!isYouTube) return;
      const width = window.innerWidth;
      const grid = document.querySelector('ytd-rich-grid-renderer');
      if (!grid) return;

      if (width <= 1350 && width >= 320) {
        grid.style.setProperty('--ytd-rich-grid-items-per-row', '2', 'important');
        grid.style.setProperty('--ytd-rich-grid-posts-per-row', '2', 'important');
        grid.style.setProperty('--ytd-rich-grid-slim-items-per-row', '2', 'important');
        try {
          if (grid.itemsPerRow !== 2) grid.itemsPerRow = 2;
          if (grid.postsPerRow !== 2) grid.postsPerRow = 2;
        } catch (e) {}
      } else if (width > 1350) {
        grid.style.removeProperty('--ytd-rich-grid-items-per-row');
        grid.style.removeProperty('--ytd-rich-grid-posts-per-row');
        grid.style.removeProperty('--ytd-rich-grid-slim-items-per-row');
      }
    }

    function purgeAdElements(root = document) {
      if (!root || !root.querySelectorAll) return;

      let newlyBlocked = 0;

      // 1. YouTube Specific Layout & Feed Optimization
      if (isYouTube) {
        adaptYouTubeGrid();

        // Collapse entire grid cards & sidebar items that contain ad slots to eliminate banners
        const ytAdSlots = root.querySelectorAll(
          'ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-banner-promo-renderer, ytd-promoted-sparkles-web-renderer, ytd-statement-banner-renderer, ytd-brand-video-singleton-renderer, ytd-primetime-promo-renderer, ytd-companion-ad-renderer, ytd-action-companion-ad-renderer, #fulfilled-layout, #player-ads, #masthead-ad, [target-id="engagement-panel-ads"]'
        );
        for (let i = 0; i < ytAdSlots.length; i++) {
          const slot = ytAdSlots[i];
          const container = slot.closest('ytd-rich-item-renderer, ytd-rich-section-renderer, ytd-item-section-renderer, ytd-engagement-panel-section-list-renderer');
          const target = container || slot;
          if (!target.dataset.speedshieldPurged) {
            target.dataset.speedshieldPurged = 'true';
            target.style.setProperty('display', 'none', 'important');
            newlyBlocked++;
          }
        }

        // Defuse anti-adblock modals & restore video playback
        const enforcementModal = root.querySelector('ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)');
        if (enforcementModal) {
          enforcementModal.remove();
          const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
          if (backdrop) backdrop.remove();
          const video = document.querySelector('video');
          if (video && video.paused) {
            video.play().catch(() => {});
          }
          newlyBlocked++;
        }
      }

      // 2. Twitch Specific Layout & Ad Element Purge
      if (isTwitch) {
        const twitchAds = root.querySelectorAll(
          '.stream-display-ad__wrapper, .tw-ad-container, [data-a-target="video-ad-countdown"], [data-a-target="video-ad-label"], [data-a-target="ax-overlay"], [data-test-selector="sad-overlay"], [data-a-target="player-overlay-ad"], div[data-a-target="sponsored-stream"], .tw-premium-banner, [data-a-target="side-nav-ad"], iframe[src*="amazon-adsystem"], iframe[src*="amazon"]'
        );
        for (let i = 0; i < twitchAds.length; i++) {
          const ad = twitchAds[i];
          if (!ad.dataset.speedshieldPurged) {
            ad.dataset.speedshieldPurged = 'true';
            ad.style.setProperty('display', 'none', 'important');
            ad.style.setProperty('visibility', 'hidden', 'important');
            ad.style.setProperty('height', '0px', 'important');
            ad.style.setProperty('pointer-events', 'none', 'important');
            newlyBlocked++;
          }
        }
      }

      // 3. Standard Web Ad Purge
      const elements = root.querySelectorAll(AD_SELECTOR_QUERY);
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.dataset.speedshieldPurged) continue;
        // Never hide YouTube navigation, core wrappers, or video player UI/popups
        if (el.id === 'masthead-container' || el.id === 'masthead' || (isYouTube && el.closest('ytd-masthead, #movie_player, .html5-video-player, .ytp-popup, .ytp-settings-menu'))) continue;

        el.dataset.speedshieldPurged = 'true';
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('height', '0px', 'important');
        el.style.setProperty('min-height', '0px', 'important');
        el.style.setProperty('max-height', '0px', 'important');
        el.style.setProperty('margin', '0px', 'important');
        el.style.setProperty('padding', '0px', 'important');
        newlyBlocked++;

      }

      // 4. Generic Empty Ad Placeholder Sweeper (Protected from YouTube core and chat apps)
      if (!isYouTube) {
        // Only evaluate empty placeholder collapsing once document is complete
        // (prevents collapsing dynamic React/Vue/Angular containers before components mount)
        const isPageComplete = document.readyState === 'complete';

        const wrappers = root.querySelectorAll(
          '[class^="ad-container"], [class*=" ad-container"], [class*="-ad-container"], ' +
          '[class^="ad-wrapper"], [class*=" ad-wrapper"], [class*="-ad-wrapper"], ' +
          '[class^="ad-slot"], [class*=" ad-slot"], [class*="-ad-slot"], ' +
          '[class*="ad-banner"], [class*="banner-ad"], [class*="ad-placement"], ' +
          '[class*="promo-banner"], [class*="cai-plus"], [class*="plus-offer"]'
        );
        for (let i = 0; i < wrappers.length; i++) {
          const w = wrappers[i];
          if (w.dataset.speedshieldPurged) continue;
          // Never hide message bubbles, inputs, interactive controls, or forms
          if (w.closest('[data-testid*="chat-message"], [class*="message"], [class*="bubble"]')) continue;
          if (w.querySelector('input, button, select, textarea, form, canvas')) continue;

          const text = (w.textContent || '').trim();
          const isExplicitAdLabel = text.toLowerCase() === 'advertisement' || text.toLowerCase() === 'sponsored';
          // If empty, verify it doesn't contain legitimate images or user content, AND only collapse if page is complete
          const isEmptyPlaceholder = isPageComplete && text === '' && !w.querySelector('img, picture, svg, video, a:not([href*="plus"])');

          if (isExplicitAdLabel || isEmptyPlaceholder) {
            w.dataset.speedshieldPurged = 'true';
            w.style.setProperty('display', 'none', 'important');
            w.style.setProperty('height', '0px', 'important');
            w.style.setProperty('min-height', '0px', 'important');
            w.style.setProperty('padding', '0px', 'important');
            w.style.setProperty('margin', '0px', 'important');
            newlyBlocked++;
          }
        }
      }

      if (newlyBlocked > 0) {
        blockedCount += newlyBlocked;
        reportBlocked(newlyBlocked);
      }

      // Prevent scroll-locking from anti-adblock modals
      if (document.body && document.body.style.overflow === 'hidden') {
        const hasOverlay = document.querySelector('.fc-ab-root, .adblock-overlay, [class*="adblock-modal"]');
        if (hasOverlay) {
          document.body.style.setProperty('overflow', 'auto', 'important');
          if (document.documentElement) {
            document.documentElement.style.setProperty('overflow', 'auto', 'important');
          }
        }
      }
    }

    // Video ad fast-forward / auto-skip (ultra-fast 0ms reaction on YouTube & Twitch)
    function handleVideoAds() {
      // A. YouTube Video Ad Fast-Forward
      if (isYouTube) {
        // If settings menu is currently open, never interfere with playback controls
        if (document.querySelector('.ytp-popup.ytp-settings-menu, .ytp-settings-menu')) {
          return;
        }

        const moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        if (!moviePlayer) return;

        const isAdShowing = moviePlayer.classList.contains('ad-showing') || moviePlayer.classList.contains('ad-interrupting');
        if (!isAdShowing) {
          const normalVideo = moviePlayer.querySelector('video');
          if (normalVideo && normalVideo.playbackRate > 2.0) {
            try {
              normalVideo.playbackRate = 1.0;
              normalVideo.muted = false;
            } catch (e) {}
          }
          return;
        }

        // Only search and click ad skip buttons when an ad is actively showing!
        const skipButtons = moviePlayer.querySelectorAll(
          '.video-ads .ytp-ad-skip-button, .video-ads .ytp-ad-skip-button-modern, .video-ads .ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button-modern, button.ytp-skip-ad-button, .videoAdUiSkipButton'
        );
        for (let i = 0; i < skipButtons.length; i++) {
          try {
            skipButtons[i].click();
            blockedCount++;
            reportBlocked(1);
          } catch (e) {}
        }

        const adVideo = moviePlayer.querySelector('video');
        if (adVideo) {
          try {
            adVideo.muted = true;
            adVideo.playbackRate = 16.0;
            if (!isNaN(adVideo.duration) && isFinite(adVideo.duration) && adVideo.duration > 0) {
              adVideo.currentTime = adVideo.duration;
            }
          } catch (e) {}
        }
      }
    }

    // Initial purge & grid adaptation
    purgeAdElements(document);
    if (isYouTube) {
      window.addEventListener('resize', adaptYouTubeGrid, { passive: true });
      window.addEventListener('yt-navigate-finish', () => {
        purgeAdElements(document);
        adaptYouTubeGrid();
        handleVideoAds();
      }, { passive: true });
      window.addEventListener('yt-page-data-updated', () => {
        purgeAdElements(document);
        adaptYouTubeGrid();
      }, { passive: true });
    }

    // Throttled high-performance requestAnimationFrame scheduler (prevents layout thrashing)
    let purgeScheduled = false;
    let lastPurgeTime = 0;
    const PURGE_THROTTLE_MS = 120; // 120ms debounce during heavy DOM mutation bursts to preserve CPU for page rendering

    function scheduleBatchedPurge() {
      if (purgeScheduled) return;
      purgeScheduled = true;
      const now = performance.now();
      const delay = Math.max(0, PURGE_THROTTLE_MS - (now - lastPurgeTime));
      setTimeout(() => {
        requestAnimationFrame(() => {
          purgeScheduled = false;
          lastPurgeTime = performance.now();
          purgeAdElements(document);
          if (isYouTube) handleVideoAds();
        });
      }, delay);
    }

    // Dynamic MutationObserver with batched frame updates for silky smooth scrolling
    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) {
          scheduleBatchedPurge();
          break;
        }
      }
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true
        });
        purgeAdElements(document);
      });
    }

    // Low-overhead video ad monitor during active playback on YouTube
    if (isYouTube) {
      setInterval(() => {
        const player = document.getElementById('movie_player');
        if (player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) {
          handleVideoAds();
        }
      }, 250);
    }

    // Proactive SPA route & layout monitor on Character.AI to catch dynamically mounted banner gaps
    /* Character.AI DOM clean-loop removed to preserve zero-flicker stability */


    // ==========================================================================
    // SECTION: Custom Cosmetic Filters & Interactive Element Zapper
    // ==========================================================================

    function updateCustomFilterCSS(selectors) {
      if (!selectors || selectors.length === 0) {
        const existing = document.getElementById('speedshield-custom-filter-css');
        if (existing) existing.remove();
        return;
      }
      let style = document.getElementById('speedshield-custom-filter-css');
      if (!style) {
        style = document.createElement('style');
        style.id = 'speedshield-custom-filter-css';
        (document.head || document.documentElement).appendChild(style);
      }
      style.textContent = selectors.join(',\n') + ` {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        min-height: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }`;
    }

    // Apply custom filters on initialization
    if (initialCustomFilters && initialCustomFilters.length > 0) {
      updateCustomFilterCSS(initialCustomFilters);
    }

    // Listen for storage changes to custom cosmetic filters
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.custom_cosmetic_filters) {
        updateCustomFilterCSS(changes.custom_cosmetic_filters.newValue || []);
      }
    });

    // Interactive Element Zapper
    let isZapperActive = false;
    let zapperHighlight = null;
    let zapperTooltip = null;
    let currentTarget = null;
    let currentSelector = '';

    function generateSelector(el) {
      if (!el || el === document.body || el === document.documentElement) return '';
      if (el.id && !/\d{4,}/.test(el.id)) {
        return '#' + CSS.escape(el.id);
      }
      const tag = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(c => c && !c.includes(':') && !/\d{4,}/.test(c));
        if (classes.length > 0) {
          return tag + '.' + CSS.escape(classes[0]);
        }
      }
      if (el.getAttribute('data-testid')) {
        return `${tag}[data-testid="${CSS.escape(el.getAttribute('data-testid'))}"]`;
      }
      if (el.getAttribute('aria-label')) {
        return `${tag}[aria-label="${CSS.escape(el.getAttribute('aria-label'))}"]`;
      }
      const parent = el.parentElement;
      if (parent && parent !== document.body) {
        const parentSel = generateSelector(parent);
        if (parentSel) {
          return `${parentSel} > ${tag}`;
        }
      }
      return tag;
    }

    function createZapperUI() {
      if (!zapperHighlight) {
        zapperHighlight = document.createElement('div');
        zapperHighlight.id = 'speedshield-zapper-highlight';
        zapperHighlight.style.cssText = `
          position: fixed !important;
          pointer-events: none !important;
          z-index: 2147483646 !important;
          border: 2px solid #ef4444 !important;
          background: rgba(239, 68, 68, 0.25) !important;
          border-radius: 4px !important;
          box-shadow: 0 0 14px rgba(239, 68, 68, 0.6) !important;
          display: none !important;
          transition: top 0.05s ease, left 0.05s ease, width 0.05s ease, height 0.05s ease !important;
        `;
        document.documentElement.appendChild(zapperHighlight);
      }

      if (!zapperTooltip) {
        zapperTooltip = document.createElement('div');
        zapperTooltip.id = 'speedshield-zapper-tooltip';
        zapperTooltip.style.cssText = `
          position: fixed !important;
          pointer-events: none !important;
          z-index: 2147483647 !important;
          background: #090d16 !important;
          border: 1px solid #00d2ff !important;
          color: #f0f6fc !important;
          padding: 6px 12px !important;
          border-radius: 6px !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.8) !important;
          display: none !important;
          white-space: nowrap !important;
        `;
        document.documentElement.appendChild(zapperTooltip);
      }
    }

    function showToast(msg) {
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 2147483647 !important;
        background: linear-gradient(135deg, #090d16, #162138) !important;
        border: 1px solid #10b981 !important;
        color: #f0f6fc !important;
        padding: 10px 20px !important;
        border-radius: 10px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6) !important;
      `;
      toast.textContent = msg;
      document.documentElement.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }

    function onZapperMouseMove(e) {
      if (!isZapperActive) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el === zapperHighlight || el === zapperTooltip || el === document.body || el === document.documentElement) {
        if (zapperHighlight) zapperHighlight.style.display = 'none';
        if (zapperTooltip) zapperTooltip.style.display = 'none';
        return;
      }

      currentTarget = el;
      currentSelector = generateSelector(el);
      const rect = el.getBoundingClientRect();

      zapperHighlight.style.top = rect.top + 'px';
      zapperHighlight.style.left = rect.left + 'px';
      zapperHighlight.style.width = rect.width + 'px';
      zapperHighlight.style.height = rect.height + 'px';
      zapperHighlight.style.display = 'block';

      zapperTooltip.textContent = `${currentSelector}  •  Click to Zap | Esc to cancel`;
      const tipTop = rect.top > 35 ? rect.top - 32 : rect.bottom + 8;
      const tipLeft = Math.max(10, Math.min(window.innerWidth - 300, rect.left));
      zapperTooltip.style.top = tipTop + 'px';
      zapperTooltip.style.left = tipLeft + 'px';
      zapperTooltip.style.display = 'block';
    }

    function onZapperClick(e) {
      if (!isZapperActive) return;
      e.preventDefault();
      e.stopPropagation();

      if (currentTarget && currentSelector) {
        currentTarget.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        currentTarget.style.transform = 'scale(0.85)';
        currentTarget.style.opacity = '0';
        const doomed = currentTarget;
        setTimeout(() => { doomed.style.display = 'none'; }, 200);

        chrome.storage.local.get(['custom_cosmetic_filters'], (res) => {
          const filters = res.custom_cosmetic_filters || [];
          if (!filters.includes(currentSelector)) {
            filters.push(currentSelector);
            chrome.storage.local.set({ custom_cosmetic_filters: filters });
          }
        });

        reportBlocked(1);
        showToast(`⚡ Element zapped & permanently blocked: ${currentSelector}`);
      }

      deactivateZapper();
    }

    function onZapperKeyDown(e) {
      if (e.key === 'Escape' && isZapperActive) {
        deactivateZapper();
        showToast('⚡ Element Zapper cancelled');
      }
    }

    function onZapperContextMenu(e) {
      if (isZapperActive) {
        e.preventDefault();
        deactivateZapper();
      }
    }

    function activateZapper() {
      if (isZapperActive) {
        deactivateZapper();
        return;
      }
      isZapperActive = true;
      createZapperUI();
      document.documentElement.style.cursor = 'crosshair';

      window.addEventListener('mousemove', onZapperMouseMove, { passive: true, capture: true });
      window.addEventListener('click', onZapperClick, { capture: true });
      window.addEventListener('keydown', onZapperKeyDown, { capture: true });
      window.addEventListener('contextmenu', onZapperContextMenu, { capture: true });
      showToast('⚡ Element Zapper Active: Hover and click any element to zap it (Esc to exit)');
    }

    function deactivateZapper() {
      isZapperActive = false;
      document.documentElement.style.cursor = '';
      if (zapperHighlight) zapperHighlight.style.display = 'none';
      if (zapperTooltip) zapperTooltip.style.display = 'none';
      currentTarget = null;
      currentSelector = '';

      window.removeEventListener('mousemove', onZapperMouseMove, { capture: true });
      window.removeEventListener('click', onZapperClick, { capture: true });
      window.removeEventListener('keydown', onZapperKeyDown, { capture: true });
      window.removeEventListener('contextmenu', onZapperContextMenu, { capture: true });
    }

    // Message listener for Element Zapper and HUD Toggle
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === 'activate_element_picker') {
        activateZapper();
        sendResponse({ status: 'active' });
      } else if (msg.action === 'toggle_hud') {
        if (typeof toggleHUDPanel === 'function') {
          toggleHUDPanel();
          sendResponse({ status: 'toggled' });
        }
      }
      return true;
    });

    // ========================================================================
    // In-Page Floating Shield Widget (Split-Screen & Vertical Tabs HUD)
    // Allows full uBlock Origin control even when browser toolbar collapses
    // ========================================================================
    function initInPageHUD(isWhitelisted, shieldEnabled, hostname, hudMode = 'auto') {
      if (document.getElementById('speedshield-hud-host')) return;

      const host = document.createElement('div');
      host.id = 'speedshield-hud-host';
      host.style.cssText = 'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; z-index: 2147483647 !important; pointer-events: none !important; overflow: visible !important; display: block !important;';
      const shadow = host.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = `
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          user-select: none;
        }
        .hud-pill {
          position: fixed;
          bottom: 24px;
          right: 24px;
          height: 34px;
          padding: 0 12px;
          background: rgba(24, 27, 34, 0.94);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 17px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: grab;
          pointer-events: auto;
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          z-index: 2147483646;
        }
        .hud-pill:hover {
          transform: scale(1.04);
          border-color: #1c68d2;
          box-shadow: 0 6px 20px rgba(28, 104, 210, 0.4);
        }
        .hud-pill:active {
          cursor: grabbing;
        }
        .shield-icon {
          width: 16px;
          height: 16px;
          fill: ${isWhitelisted ? '#888' : '#1c68d2'};
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }
        .badge-count {
          font-size: 12px;
          font-weight: 700;
          color: ${isWhitelisted ? '#888' : '#fff'};
          line-height: 1;
          min-width: 14px;
          text-align: center;
        }
        .pill-handle {
          font-size: 11px;
          color: #6e7681;
          letter-spacing: -1px;
        }
        .hud-panel {
          position: fixed;
          bottom: 66px;
          right: 24px;
          width: 240px;
          background: #1e1e1e;
          border: 1px solid #333333;
          border-radius: 4px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
          color: #e0e0e0;
          pointer-events: auto;
          display: none;
          flex-direction: column;
          overflow: hidden;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          animation: hudFadeIn 0.12s ease-out;
        }
        @keyframes hudFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .panel-header {
          background: #242424;
          padding: 6px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #2e2e2e;
          font-size: 11px;
          font-weight: 600;
          color: #999;
        }
        .panel-title {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #bbb;
        }
        .panel-logo {
          width: 13px;
          height: 13px;
          fill: #1c68d2;
        }
        .panel-header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .panel-hdr-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 2px 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          transition: color 0.15s, background 0.15s;
        }
        .panel-hdr-btn:hover {
          color: #fff;
          background: #333;
        }
        .panel-close {
          background: none;
          border: none;
          color: #888;
          font-size: 13px;
          cursor: pointer;
          padding: 0 3px;
          line-height: 1;
        }
        .panel-close:hover {
          color: #fff;
        }
        .domain-box {
          padding: 10px 10px 4px;
          text-align: center;
        }
        .domain-name {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          word-break: break-all;
        }
        .domain-name.strikethrough {
          text-decoration: line-through;
          color: #777;
        }
        .power-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 12px 0 10px;
        }
        .power-btn {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 2px solid ${isWhitelisted ? '#444' : '#1c68d2'};
          background: ${isWhitelisted ? '#2a2a2a' : '#1c68d2'};
          box-shadow: ${isWhitelisted ? 'none' : '0 0 14px rgba(28, 104, 210, 0.4)'};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.12s ease, background 0.15s ease;
        }
        .power-btn:hover {
          transform: scale(1.05);
        }
        .power-icon {
          width: 26px;
          height: 26px;
          stroke: #ffffff;
          fill: none;
          stroke-width: 2.6;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .power-btn.whitelisted .power-icon {
          stroke: #666;
        }
        .stats-table {
          margin: 6px 10px 10px;
          background: #242424;
          border: 1px solid #2e2e2e;
          border-radius: 4px;
          padding: 6px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 11px;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          color: #999;
        }
        .stat-val {
          font-weight: 700;
          color: #eee;
        }
        .tools-row {
          display: flex;
          justify-content: space-around;
          padding: 6px 4px;
          border-top: 1px solid #2e2e2e;
          background: #181818;
        }
        .tool-btn {
          width: 32px;
          height: 30px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          color: #777;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tool-btn:hover {
          background: #282828;
          color: #ddd;
          border-color: #383838;
        }
        .tool-btn.active {
          color: #1c68d2;
        }
        .tool-btn.active:hover {
          color: #3a88f7;
        }
      `;
      shadow.appendChild(style);

      const pill = document.createElement('div');
      pill.className = 'hud-pill';
      pill.id = 'hudPill';
      pill.title = 'SpeedShield Protection (Click to open, Alt+Shift+S, drag to move)';
      pill.innerHTML = `
        <div class="shield-icon">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1 14.5l-3.5-3.5 1.41-1.41L11 13.67l5.59-5.59 1.41 1.41-7 7z"/></svg>
        </div>
        <span class="badge-count" id="pillCount">0</span>
        <span class="pill-handle">⋮⋮</span>
      `;
      shadow.appendChild(pill);

      const panel = document.createElement('div');
      panel.className = 'hud-panel';
      panel.id = 'hudPanel';
      panel.innerHTML = `
        <div class="panel-header">
          <div class="panel-title">
            <svg viewBox="0 0 24 24" class="panel-logo"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1 14.5l-3.5-3.5 1.41-1.41L11 13.67l5.59-5.59 1.41 1.41-7 7z"/></svg>
            <span>SpeedShield</span>
          </div>
          <div class="panel-header-actions">
            <button class="panel-hdr-btn" id="hdrZapBtn" title="Enter element zapper mode (Alt+Z)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </button>
            <button class="panel-hdr-btn" id="hdrOptionsBtn" title="Open the dashboard">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <button class="panel-close" id="panelClose" title="Close">✕</button>
          </div>
        </div>
        <div class="domain-box">
          <div class="domain-name ${isWhitelisted ? 'strikethrough' : ''}" id="domainName">${hostname}</div>
        </div>
        <div class="power-container">
          <button class="power-btn ${isWhitelisted ? 'whitelisted' : 'active'}" id="powerBtn" title="Click to toggle protection on ${hostname}">
            <svg viewBox="0 0 24 24" class="power-icon">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
              <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
          </button>
        </div>
        <div class="stats-table">
          <div class="stat-row">
            <span>Requests blocked</span>
            <span class="stat-val" id="statPageCount">0</span>
          </div>
          <div class="stat-row">
            <span>Since install</span>
            <span class="stat-val" id="statAllTime">0</span>
          </div>
          <div class="stat-row">
            <span>Custom rules</span>
            <span class="stat-val" id="statCustomRules">0</span>
          </div>
        </div>
        <div class="tools-row">
          <button class="tool-btn" id="toolZap" title="Enter element zapper mode (Alt+Z)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </button>
          <button class="tool-btn active" id="toolCookies" title="Cosmetic Filtering & Cookie Defuser (Click to toggle)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path>
              <path d="M8.5 8.5v.01"></path>
              <path d="M7 14v.01"></path>
              <path d="M15 15v.01"></path>
              <path d="M11 17v.01"></path>
            </svg>
          </button>
          <button class="tool-btn active" id="toolCleaner" title="URL Tracking Cleaner (Click to toggle)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </button>
          <button class="tool-btn" id="toolOptions" title="Open the dashboard">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      `;
      shadow.appendChild(panel);

      // Restore saved position
      try {
        const savedPos = localStorage.getItem('speedshield_hud_pos');
        if (savedPos) {
          const { left, top } = JSON.parse(savedPos);
          if (typeof left === 'number' && typeof top === 'number') {
            const maxX = Math.max(10, window.innerWidth - 80);
            const maxY = Math.max(10, window.innerHeight - 50);
            pill.style.left = Math.min(Math.max(10, left), maxX) + 'px';
            pill.style.top = Math.min(Math.max(10, top), maxY) + 'px';
            pill.style.right = 'auto';
            pill.style.bottom = 'auto';
          }
        }
      } catch (e) {}

      // Draggable logic
      let isDragging = false;
      let startX = 0, startY = 0;
      let initialLeft = 0, initialTop = 0;
      let hasMoved = false;

      pill.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        const rect = pill.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });

      function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          hasMoved = true;
          const newLeft = Math.min(Math.max(5, initialLeft + dx), window.innerWidth - pill.offsetWidth - 5);
          const newTop = Math.min(Math.max(5, initialTop + dy), window.innerHeight - pill.offsetHeight - 5);
          pill.style.left = newLeft + 'px';
          pill.style.top = newTop + 'px';
          pill.style.right = 'auto';
          pill.style.bottom = 'auto';
        }
      }

      function onMouseUp(e) {
        if (!isDragging) return;
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (hasMoved) {
          const rect = pill.getBoundingClientRect();
          try {
            localStorage.setItem('speedshield_hud_pos', JSON.stringify({ left: rect.left, top: rect.top }));
          } catch (e) {}
        } else {
          togglePanel();
        }
      }

      function positionPanel() {
        const pillRect = pill.getBoundingClientRect();
        const panelWidth = 240;
        const panelHeight = 220;

        let left = pillRect.left;
        if (left + panelWidth > window.innerWidth - 10) {
          left = window.innerWidth - panelWidth - 10;
        }
        if (left < 10) left = 10;

        let top = pillRect.top - panelHeight - 10;
        if (top < 10) {
          top = pillRect.bottom + 10;
        }

        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      }

      function togglePanel() {
        const isShown = panel.style.display === 'flex';
        if (isShown) {
          panel.style.display = 'none';
        } else {
          positionPanel();
          panel.style.display = 'flex';
          refreshStats();
        }
      }
      toggleHUDPanel = togglePanel;

      function refreshStats() {
        if (!chrome.runtime || !chrome.runtime.id) return;
        try {
          chrome.runtime.sendMessage({ action: 'get_tab_stats' }, (data) => {
            if (chrome.runtime.lastError || !data) return;
            const count = Math.max(blockedCount, data.tabBlocked || 0);
            updateCount(count);
            const statAllTime = shadow.getElementById('statAllTime');
            if (statAllTime && data.totalBlocked !== undefined) {
              statAllTime.textContent = (data.totalBlocked).toLocaleString();
            }
            const statCustomRules = shadow.getElementById('statCustomRules');
            if (statCustomRules && data.customFiltersCount !== undefined) {
              statCustomRules.textContent = String(data.customFiltersCount);
            }
            const toolCookies = shadow.getElementById('toolCookies');
            if (toolCookies) {
              toolCookies.classList.toggle('active', data.cookieShieldEnabled !== false);
            }
            const toolCleaner = shadow.getElementById('toolCleaner');
            if (toolCleaner) {
              toolCleaner.classList.toggle('active', data.urlCleanerEnabled !== false);
            }
          });
        } catch (e) {}
      }

      function updateCount(c) {
        const pillCount = shadow.getElementById('pillCount');
        const statPageCount = shadow.getElementById('statPageCount');
        if (pillCount) pillCount.textContent = String(c);
        if (statPageCount) statPageCount.textContent = String(c);
      }
      updateHUDCount = updateCount;

      // Event Listeners for panel
      const panelClose = shadow.getElementById('panelClose');
      if (panelClose) {
        panelClose.addEventListener('click', (e) => {
          e.stopPropagation();
          panel.style.display = 'none';
        });
      }

      const powerBtn = shadow.getElementById('powerBtn');
      if (powerBtn) {
        powerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!chrome.runtime || !chrome.runtime.id) return;
          chrome.runtime.sendMessage({ action: 'toggle_whitelist', domain: hostname }, () => {
            window.location.reload();
          });
        });
      }

      function openOptions() {
        panel.style.display = 'none';
        chrome.runtime.sendMessage({ action: 'open_dashboard' });
      }

      const hdrOptionsBtn = shadow.getElementById('hdrOptionsBtn');
      if (hdrOptionsBtn) hdrOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openOptions();
      });

      const toolOptions = shadow.getElementById('toolOptions');
      if (toolOptions) toolOptions.addEventListener('click', (e) => {
        e.stopPropagation();
        openOptions();
      });

      function startZapper() {
        panel.style.display = 'none';
        activateZapper();
      }

      const hdrZapBtn = shadow.getElementById('hdrZapBtn');
      if (hdrZapBtn) hdrZapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startZapper();
      });

      const toolZap = shadow.getElementById('toolZap');
      if (toolZap) toolZap.addEventListener('click', (e) => {
        e.stopPropagation();
        startZapper();
      });

      const toolCookies = shadow.getElementById('toolCookies');
      if (toolCookies) {
        toolCookies.addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.runtime.sendMessage({ action: 'toggle_cookie_shield' }, (res) => {
            const active = res && res.cookieShieldEnabled !== false;
            toolCookies.classList.toggle('active', active);
            showToast(active ? 'Cookie defuser enabled' : 'Cookie defuser disabled');
          });
        });
      }

      const toolCleaner = shadow.getElementById('toolCleaner');
      if (toolCleaner) {
        toolCleaner.addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.runtime.sendMessage({ action: 'toggle_url_cleaner' }, (res) => {
            const active = res && res.urlCleanerEnabled !== false;
            toolCleaner.classList.toggle('active', active);
            showToast(active ? 'URL cleaner enabled' : 'URL cleaner disabled');
          });
        });
      }

      // Global window click to dismiss panel when clicking outside
      window.addEventListener('mousedown', (e) => {
        if (panel.style.display === 'flex') {
          const path = e.composedPath ? e.composedPath() : [];
          if (!path.includes(host)) {
            panel.style.display = 'none';
          }
        }
      });

      // Keyboard shortcut listener on page: Alt+Shift+S or Alt+S
      window.addEventListener('keydown', (e) => {
        if (e.altKey && (e.code === 'KeyS' || e.key.toLowerCase() === 's')) {
          e.preventDefault();
          togglePanel();
        }
      }, { capture: true });

      // Automatic Split-Screen / Narrow Viewport Detection
      function isSplitScreenOrNarrow() {
        const isNarrow = window.innerWidth <= 1050;
        const isSnapped = screen.availWidth > 0 && window.innerWidth <= (screen.availWidth * 0.72);
        return isNarrow || isSnapped;
      }

      function updatePillVisibility() {
        if (hudMode === 'never') {
          pill.style.display = 'none';
          return;
        }
        if (hudMode === 'always') {
          pill.style.display = 'flex';
          return;
        }
        // Mode 'auto' (Default): only show in split-screen or narrow windows where top bar collapsed
        if (isSplitScreenOrNarrow()) {
          pill.style.display = 'flex';
        } else {
          pill.style.display = 'none';
          if (panel.style.display === 'flex') {
            panel.style.display = 'none';
          }
        }
      }

      window.addEventListener('resize', updatePillVisibility, { passive: true });
      updatePillVisibility();

      // Fetch initial count
      refreshStats();

      // Attach host to document
      function attachHost() {
        if (!document.getElementById('speedshield-hud-host')) {
          if (document.body) {
            document.body.appendChild(host);
          } else if (document.documentElement) {
            document.documentElement.appendChild(host);
          }
        } else if (document.body && host.parentElement !== document.body) {
          document.body.appendChild(host);
        }
      }
      attachHost();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachHost, { once: true });
        window.addEventListener('load', attachHost, { once: true });
      }
    }
  }
})();
