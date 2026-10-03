// ==========================================================================
// SpeedShield - Cosmetic Engine & DOM Cleaner
// Collapses ad slots, purges empty placeholders, defuses anti-adblockers
// YouTube 2-Video Split Mode & Zero-Latency Video Ad Skipper
// ==========================================================================

(function() {
  'use strict';

  if (!chrome.runtime || !chrome.runtime.id) return;

  try {
    // Check if extension is enabled or site is whitelisted
    chrome.storage.local.get(['shield_enabled', 'whitelist', 'dynamic_cosmetic_selectors'], (data) => {
      if (chrome.runtime.lastError || !data) return;
      if (data.shield_enabled === false) return;

      const hostname = (window.location.hostname || '').toLowerCase();
      const whitelist = data.whitelist || [];
      if (whitelist.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return;
      }

      initCosmeticEngine(data.dynamic_cosmetic_selectors || []);
    });
  } catch (e) {}

  function initCosmeticEngine(dynamicSelectors = []) {
    let blockedCount = 0;
    const isYouTube = window.location.hostname.includes('youtube.com');
    const isTwitch = window.location.hostname.includes('twitch.tv');

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
      '#adblock-notice'
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
        // Never hide YouTube navigation or core wrappers
        if (el.id === 'masthead-container' || el.id === 'masthead' || (isYouTube && el.closest('ytd-masthead'))) continue;

        el.dataset.speedshieldPurged = 'true';
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('height', '0px', 'important');
        el.style.setProperty('margin', '0px', 'important');
        el.style.setProperty('padding', '0px', 'important');
        newlyBlocked++;
      }

      // 3. Generic Empty Ad Placeholder Sweeper (Protected from YouTube core)
      if (!isYouTube) {
        const wrappers = root.querySelectorAll('[class^="ad-container"], [class*=" ad-container"], [class*="-ad-container"], [class^="ad-wrapper"], [class*=" ad-wrapper"], [class*="-ad-wrapper"], [class^="ad-slot"], [class*=" ad-slot"], [class*="-ad-slot"]');
        for (let i = 0; i < wrappers.length; i++) {
          const w = wrappers[i];
          if (w.dataset.speedshieldPurged) continue;
          const text = (w.textContent || '').trim();
          if (text === '' || text.toLowerCase() === 'advertisement' || text.toLowerCase() === 'sponsored') {
            w.dataset.speedshieldPurged = 'true';
            w.style.setProperty('display', 'none', 'important');
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
        const moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        if (moviePlayer) {
          const skipButtons = moviePlayer.querySelectorAll(
            '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button-modern, .videoAdUiSkipButton, [id^="skip-button"] button, .ytp-ad-overlay-close-button'
          );
          for (let i = 0; i < skipButtons.length; i++) {
            try {
              skipButtons[i].click();
              blockedCount++;
              reportBlocked(1);
            } catch (e) {}
          }

          if (moviePlayer.classList.contains('ad-showing') || moviePlayer.classList.contains('ad-interrupting')) {
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
          } else {
            const normalVideo = moviePlayer.querySelector('video');
            if (normalVideo && normalVideo.playbackRate > 2.0) {
              try {
                normalVideo.playbackRate = 1.0;
                normalVideo.muted = false;
              } catch (e) {}
            }
          }
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

    // Batched 60-120 FPS requestAnimationFrame scheduler (prevents layout thrashing)
    let purgeScheduled = false;
    function scheduleBatchedPurge() {
      if (purgeScheduled) return;
      purgeScheduled = true;
      requestAnimationFrame(() => {
        purgeScheduled = false;
        purgeAdElements(document);
        if (isYouTube) handleVideoAds();
      });
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
  }
})();
