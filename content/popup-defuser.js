// ==========================================================================
// SpeedShield - Advanced Popup Defuser, Ad Accelerator & Telemetry Silencer
// Injected into page context (world: MAIN) at document_start
// Protects from rogue popups, accelerates page loads, and ensures 24/7 web compatibility
// ==========================================================================

(function() {
  'use strict';

  // Helper to safely name functions without tampering with native prototypes
  function makeNative(fn, name) {
    if (typeof fn !== 'function') return fn;
    if (name) {
      try {
        Object.defineProperty(fn, 'name', { value: name, configurable: true });
      } catch (e) {}
    }
    return fn;
  }

  // ==========================================================================
  // Layer 0: Security Verification, CAPTCHA & Anti-Bot Pure Passthrough Guard
  // Cloudflare Turnstile, AWS WAF, Google Verification, reCAPTCHA, hCaptcha,
  // and challenge frames run in 100% pure native Chrome with zero interference.
  // ==========================================================================
  const currentHost = (window.location.hostname || '').toLowerCase();
  const currentPath = (window.location.pathname || '').toLowerCase();
  const currentHref = (window.location.href || '').toLowerCase();

  const isSecurityVerificationPage = (function() {
    const challengeHosts = [
      'challenges.cloudflare.com',
      'cloudflare.com',
      'turnstile',
      'recaptcha.net',
      'hcaptcha.com',
      'arkoselabs.com',
      'funcaptcha.com',
      'datadome.co',
      'kasada.io',
      'perimeterx.net',
      'humanpresence.io'
    ];
    if (challengeHosts.some(h => currentHost.includes(h))) return true;

    if (currentHost.includes('google.') && (currentPath.includes('/sorry') || currentPath.includes('/recaptcha') || currentHref.includes('recaptcha'))) {
      return true;
    }

    if (
      currentPath.includes('/cdn-cgi/challenge-platform') ||
      currentPath.includes('/challenge-platform') ||
      currentHref.includes('__cf_chl') ||
      currentHref.includes('cf-chl') ||
      currentHref.includes('cf_chl') ||
      currentHref.includes('turnstile')
    ) {
      return true;
    }

    try {
      const title = (document.title || '').toLowerCase();
      if (
        title.includes('just a moment') ||
        title.includes('verifying your request') ||
        title.includes('attention required') ||
        title.includes('security check')
      ) {
        return true;
      }
    } catch (e) {}

    return false;
  })();

  if (isSecurityVerificationPage) {
    // Pure native execution for all verification challenges
    return;
  }

  // ==========================================================================
  // SECTION 1: Rogue Popup & Clickjack Defuser
  // Blocks known rogue ad networks and unprompted background popup windows
  // ==========================================================================
  const SUSPICIOUS_PATTERNS = [
    'onclickbright', 'deloton', 'ad-maven', 'popcash', 'popads',
    'exosrv', 'realsrv', 'tsyndicate', 'clksite', 'adplxmd',
    'adsco.re', 'adcash', 'adsterra', 'propellerads', 'hilltopads',
    'clickadu', 'trafficjunky', 'outbrain', 'taboola', 'revcontent',
    'doubleclick', 'pagead2', 'yieldlove', 'bet365', '1xbet',
    '/ad/click', '/adclick', 'adclick.', '/popunder', 'popunder.',
    'utm_medium=popup', 'format=popunder'
  ];

  // Whitelist of authentication, OAuth, federated login, and payment gateways worldwide
  const TRUSTED_AUTH_PAYMENT_DOMAINS = [
    'accounts.google.com',
    'appleid.apple.com',
    'login.microsoftonline.com',
    'login.live.com',
    'github.com',
    'gitlab.com',
    'facebook.com',
    'twitter.com',
    'x.com',
    'auth0.com',
    'okta.com',
    'paypal.com',
    'stripe.com',
    'checkout.stripe.com',
    'pay.google.com',
    'klarna.com',
    'razorpay.com',
    'square.com',
    'cash.app',
    'authorize.net',
    'braintreegateway.com'
  ];

  const originalWindowOpen = window.open;

  // Track user interaction timestamps across clicks, taps, keypresses, and form submits
  let lastTrustedInteractionTime = 0;
  const markTrustedInteraction = (e) => {
    if (e.isTrusted) {
      lastTrustedInteractionTime = Date.now();
    }
  };

  window.addEventListener('click', markTrustedInteraction, true);
  window.addEventListener('pointerdown', markTrustedInteraction, true);
  window.addEventListener('keydown', markTrustedInteraction, true);
  window.addEventListener('submit', markTrustedInteraction, true);

  // Override window.open to stop intrusive popups while protecting OAuth, payments, and navigation
  window.open = makeNative(function(url, target, features) {
    const now = Date.now();
    const timeSinceInteraction = now - lastTrustedInteractionTime;

    const urlStr = String(url || '').toLowerCase();
    const isSuspicious = SUSPICIOUS_PATTERNS.some(p => urlStr.includes(p));

    // Check if destination is a recognized OAuth or Payment flow
    const isAuthOrPayment = TRUSTED_AUTH_PAYMENT_DOMAINS.some(domain => {
      return urlStr.includes('://' + domain) || urlStr.includes('.' + domain);
    });

    const isSameOrigin = !urlStr ||
      urlStr === 'about:blank' ||
      urlStr.startsWith('/') ||
      urlStr.startsWith('./') ||
      urlStr.startsWith(window.location.origin.toLowerCase());

    const isYouTube = (window.location.hostname || '').includes('youtube.com');

    // Always allow legitimate OAuth, Payment, YouTube, or Same-Origin calls if not suspicious
    if ((isAuthOrPayment || isYouTube || isSameOrigin) && !isSuspicious) {
      return originalWindowOpen.apply(this, arguments);
    }

    // Explicitly block known rogue ad networks
    if (isSuspicious) {
      console.warn('[SpeedShield] Blocked rogue ad popup attempt:', url);
      return null;
    }

    // For third-party windows: require trusted user interaction within 4000ms
    if (timeSinceInteraction > 4000) {
      console.warn('[SpeedShield] Blocked unprompted background popup attempt:', url);
      return null;
    }

    return originalWindowOpen.apply(this, arguments);
  }, 'open');

  // Defuse rapid dialog spam (alert/confirm/prompt loops)
  let lastDialogTime = 0;
  let dialogSpamCount = 0;
  const originalAlert = window.alert;

  window.alert = makeNative(function(msg) {
    const now = Date.now();
    if (now - lastDialogTime < 1000) {
      dialogSpamCount++;
      if (dialogSpamCount > 2) {
        console.warn('[SpeedShield] Defused alert dialog loop:', msg);
        return;
      }
    } else {
      dialogSpamCount = 0;
    }
    lastDialogTime = now;
    return originalAlert.apply(this, arguments);
  }, 'alert');

  // Automation / Bot signature hygiene
  try {
    if (typeof navigator !== 'undefined' && navigator.webdriver === true) {
      Object.defineProperty(Navigator.prototype, 'webdriver', {
        get: makeNative(function() { return false; }, 'get webdriver'),
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {}

  // ==========================================================================
  // SECTION 2: Universal Telemetry Silencer & Fetch Interceptor
  // Drops tracking loops on Reddit & Twitch without touching core application APIs
  // ==========================================================================
  const isReddit = (window.location.hostname || '').includes('reddit.com');
  const isTwitch = (window.location.hostname || '').includes('twitch.tv');
  const isYouTubeHost = (window.location.hostname || '').includes('youtube.com');

  // 1. Silent Beacon Interception
  try {
    const hookBeacon = function(target) {
      if (!target || typeof target.sendBeacon !== 'function') return;
      const originalSendBeacon = target.sendBeacon;
      target.sendBeacon = makeNative(function(url, data) {
        const u = String(url || '').toLowerCase();
        if (
          u.includes('telemetry') ||
          u.includes('analytics') ||
          u.includes('events.reddit.com') ||
          u.includes('spade.twitch.tv')
        ) {
          return true; // Return true so tracking scripts think data was dispatched successfully
        }
        return originalSendBeacon.apply(this, arguments);
      }, 'sendBeacon');
    };

    if (typeof Navigator !== 'undefined' && Navigator.prototype) {
      hookBeacon(Navigator.prototype);
    }
    if (typeof navigator !== 'undefined') {
      hookBeacon(navigator);
    }
  } catch (e) {}

  // 2. Global fetch() Interceptor (Zero-Latency Native Passthrough)
  const originalFetch = window.fetch;
  window.fetch = makeNative(function(...args) {
    const rawUrl = args[0];
    const url = typeof rawUrl === 'string' ? rawUrl : (rawUrl && typeof rawUrl === 'object' && rawUrl.url ? rawUrl.url : '');
    const options = args[1] || {};

    // Reddit Telemetry: Return immediate mock 200 OK to prevent retry flooding
    if (isReddit && (url.includes('svc/events') || url.includes('preload-head') || url.includes('events.reddit.com'))) {
      return Promise.resolve(new Response('{"data":{"success":true}}', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Reddit GraphQL Telemetry & Ad Tracking Operations
    if (isReddit && url.includes('gql.reddit.com')) {
      try {
        const bodyStr = typeof options.body === 'string' ? options.body : '';
        if (
          bodyStr.includes('Telemetry') ||
          bodyStr.includes('LogEvent') ||
          bodyStr.includes('AdImpression') ||
          bodyStr.includes('Track')
        ) {
          return Promise.resolve(new Response('{"data":{"success":true}}', {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      } catch (e) {}
    }

    // Twitch GraphQL Telemetry & Ad Operations
    if (isTwitch && url.includes('gql.twitch.tv')) {
      try {
        const bodyStr = typeof options.body === 'string' ? options.body : '';
        if (
          bodyStr.includes('ClientSideAdEventHandling') ||
          bodyStr.includes('Commercial') ||
          bodyStr.includes('CommercialBreak') ||
          bodyStr.includes('AdBreak') ||
          bodyStr.includes('ShowAd') ||
          bodyStr.includes('WatchTrack') ||
          bodyStr.includes('VideoPlayer_Ad') ||
          bodyStr.includes('AdEligibility') ||
          bodyStr.includes('GetAdProperties') ||
          bodyStr.includes('StripedAd') ||
          bodyStr.includes('Spade')
        ) {
          return Promise.resolve(new Response(JSON.stringify([{ data: { success: true } }]), {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      } catch (e) {}
    }

    // YouTube Native Ad Pruning on player & next endpoints
    if (isYouTubeHost && (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next'))) {
      return originalFetch.apply(this, args).then(async (response) => {
        try {
          const clone = response.clone();
          const json = await clone.json();
          pruneYouTubeAdData(json);

          return new Response(JSON.stringify(json), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        } catch (e) {
          return response;
        }
      });
    }

    // 100% native zero-overhead passthrough for all standard web traffic
    return originalFetch.apply(this, args);
  }, 'fetch');

  // ==========================================================================
  // SECTION 3: YouTube Zero-Latency Native Ad Killer & Fast-Forward Engine
  // ==========================================================================
  function pruneYouTubeAdData(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    try {
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          pruneYouTubeAdData(obj[i]);
        }
      } else {
        delete obj.adPlacements;
        delete obj.playerAds;
        delete obj.adSlots;
        delete obj.adBreakHeartbeatParams;
        delete obj.adSlotRenderer;
        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            pruneYouTubeAdData(obj[key]);
          }
        }
      }
    } catch (e) {}
    return obj;
  }

  if (window.location.hostname.includes('youtube.com')) {
    // Pre-emptively intercept initial player response
    try {
      let initialResponse = window.ytInitialPlayerResponse;
      Object.defineProperty(window, 'ytInitialPlayerResponse', {
        get() {
          return initialResponse;
        },
        set(val) {
          initialResponse = pruneYouTubeAdData(val);
        },
        configurable: true
      });
      if (initialResponse) pruneYouTubeAdData(initialResponse);
    } catch (e) {}

    let adWasActive = false;

    function isYouTubeAdActive() {
      const player = document.getElementById('movie_player') || window.movie_player;
      if (player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) {
        return true;
      }
      return !!document.querySelector(
        '.video-ads .ytp-ad-player-overlay, .video-ads .ytp-ad-player-overlay-layout, .ytp-ad-preview-container'
      );
    }

    // Native Video Ad Fast-Forward & Instaskip Engine
    function killActiveYouTubeAds() {
      if (document.querySelector('.ytp-popup.ytp-settings-menu, .ytp-settings-menu')) {
        return;
      }

      const isAdActive = isYouTubeAdActive();

      if (!isAdActive) {
        if (adWasActive) {
          adWasActive = false;
          const videos = document.querySelectorAll('video');
          for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            try {
              if (v.playbackRate > 2.0) {
                v.playbackRate = 1.0;
              }
              v.muted = false;
            } catch (e) {}
          }
        }
        return;
      }

      adWasActive = true;

      // Auto-click actual YouTube ad skip buttons ONLY when an ad is active
      const skipSelectors = [
        '.video-ads .ytp-ad-skip-button',
        '.video-ads .ytp-ad-skip-button-modern',
        '.video-ads .ytp-skip-ad-button',
        '.video-ads .ytp-ad-skip-button-container button',
        '.video-ads .ytp-ad-skip-button-slot button',
        '.ytp-ad-skip-button-modern',
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button',
        'button.ytp-ad-skip-button-modern',
        'button.ytp-skip-ad-button'
      ];

      const skipButtons = document.querySelectorAll(skipSelectors.join(', '));
      for (let i = 0; i < skipButtons.length; i++) {
        try {
          skipButtons[i].click();
        } catch (e) {}
      }

      // Native player skipAd() call
      try {
        const player = document.getElementById('movie_player') || window.movie_player;
        if (player && typeof player.skipAd === 'function') {
          player.skipAd();
        }
      } catch (e) {}

      // Fast-forward video ad segments to instant finish
      const videos = document.querySelectorAll('video');
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        try {
          v.muted = true;
          v.playbackRate = 16.0;
          if (isFinite(v.duration) && v.duration > 0) {
            v.currentTime = v.duration;
          }
        } catch (e) {}
      }
    }

    function hookVideos() {
      const videos = document.querySelectorAll('video');
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (v._speedshieldHooked) continue;
        v._speedshieldHooked = true;

        v.addEventListener('timeupdate', () => {
          if (isYouTubeAdActive()) killActiveYouTubeAds();
        }, { passive: true });
        v.addEventListener('play', () => {
          if (isYouTubeAdActive()) killActiveYouTubeAds();
        }, { passive: true });
        v.addEventListener('playing', () => {
          if (isYouTubeAdActive()) killActiveYouTubeAds();
        }, { passive: true });
        v.addEventListener('loadeddata', () => {
          if (isYouTubeAdActive()) killActiveYouTubeAds();
        }, { passive: true });
      }
    }

    hookVideos();
    setInterval(() => {
      hookVideos();
      if (isYouTubeAdActive()) {
        killActiveYouTubeAds();
      }
    }, 250);

    if (typeof MutationObserver !== 'undefined') {
      const adObserver = new MutationObserver(() => {
        if (isYouTubeAdActive()) {
          killActiveYouTubeAds();
        }
        hookVideos();
      });

      if (document.documentElement) {
        adObserver.observe(document.documentElement, { childList: true, subtree: true });
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          adObserver.observe(document.documentElement, { childList: true, subtree: true });
        });
      }
    }
  }

  // ==========================================================================
  // SECTION 4: Twitch Zero-Latency Stream Accelerator & Ad Overlay Dismissal
  // ==========================================================================
  if (window.location.hostname.includes('twitch.tv')) {
    function dismissTwitchAdOverlays() {
      const skipButtons = document.querySelectorAll(
        'button[data-a-target="video-ad-skip-button"], ' +
        'button[data-a-target="close-button"], ' +
        '.tw-ad-button-close, ' +
        '[data-a-target="player-overlay-ad"] button'
      );
      for (let i = 0; i < skipButtons.length; i++) {
        try {
          skipButtons[i].click();
        } catch (e) {}
      }

      const videos = document.querySelectorAll('video');
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        try {
          if (v.playbackRate !== 1.0 && isFinite(v.playbackRate)) {
            v.playbackRate = 1.0;
          }
        } catch (e) {}
      }
    }

    if (typeof MutationObserver !== 'undefined') {
      const twitchObserver = new MutationObserver(() => {
        dismissTwitchAdOverlays();
      });

      if (document.documentElement) {
        twitchObserver.observe(document.documentElement, { childList: true, subtree: true });
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          twitchObserver.observe(document.documentElement, { childList: true, subtree: true });
        });
      }
    }

    setInterval(dismissTwitchAdOverlays, 2000);
  }

  // ==========================================================================
  // SECTION 5: Broken Telemetry Preload Neutralizer (Reddit, etc.)
  // ==========================================================================
  if (window.location.hostname.includes('reddit.com')) {
    function purgeBrokenPreloads(root) {
      try {
        const target = root || document;
        if (target.querySelectorAll) {
          const brokenLinks = target.querySelectorAll(
            'link[rel="preload"][href*="preload-head"], link[rel="preload"][href*="svc/events"]'
          );
          for (let i = 0; i < brokenLinks.length; i++) {
            brokenLinks[i].remove();
          }
        }
      } catch (e) {}
    }

    purgeBrokenPreloads();

    if (typeof MutationObserver !== 'undefined') {
      const preloadObserver = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
          const added = mutations[i].addedNodes;
          for (let j = 0; j < added.length; j++) {
            const node = added[j];
            if (node.nodeType === 1) {
              const href = (node.getAttribute && node.getAttribute('href')) || node.href || '';
              if (node.tagName === 'LINK' && node.rel === 'preload' && (href.includes('preload-head') || href.includes('svc/events'))) {
                node.remove();
              } else if (node.querySelectorAll) {
                purgeBrokenPreloads(node);
              }
            }
          }
        }
      });

      function attachPreloadObserver() {
        if (document.documentElement) {
          preloadObserver.observe(document.documentElement, { childList: true, subtree: true });
          purgeBrokenPreloads();
        } else {
          document.addEventListener('DOMContentLoaded', attachPreloadObserver, { once: true });
        }
      }
      attachPreloadObserver();
    }
  }

  // ==========================================================================
  // SECTION 6: Safe Ad Framework Callback Accelerators
  // Executes pending callbacks of blocked ad frameworks immediately
  // Never stubs core web app frameworks (GTM, OneTrust, Optanon) to preserve page loading
  // ==========================================================================
  try {
    const noopFn = function() {};

    // 1. Google Publisher Tag (googletag / GPT)
    if (!window.googletag) {
      const gptCmd = [];
      gptCmd.push = function(...fns) {
        for (const fn of fns) {
          if (typeof fn === 'function') {
            try { fn.call(window); } catch (e) {}
          }
        }
        return gptCmd.length;
      };
      window.googletag = {
        cmd: gptCmd,
        pubads: () => ({
          addEventListener: noopFn,
          clear: noopFn,
          collapseEmptyDivs: noopFn,
          disableInitialLoad: noopFn,
          enableAsyncRendering: noopFn,
          enableLazyLoad: noopFn,
          enableSingleRequest: noopFn,
          refresh: noopFn,
          setCentering: noopFn,
          setTargeting: noopFn
        }),
        companionAds: () => ({ setRefreshUnfilledSlots: noopFn }),
        sizeMapping: () => ({ addSize: noopFn, build: () => [] }),
        defineSlot: () => ({ addService: noopFn, setTargeting: noopFn, setCollapseEmptyDiv: noopFn }),
        defineOutOfPageSlot: () => ({ addService: noopFn }),
        display: noopFn,
        enableServices: noopFn
      };
    }

    // 2. Amazon Publisher Services (apstag)
    if (!window.apstag) {
      window.apstag = {
        init: (cfg, cb) => { if (typeof cb === 'function') try { cb(); } catch (e) {} },
        fetchBids: (cfg, cb) => { if (typeof cb === 'function') try { cb([]); } catch (e) {} },
        setDisplayBids: noopFn
      };
    }

    // 3. Prebid.js (pbjs)
    if (!window.pbjs) {
      const pbjsQue = [];
      pbjsQue.push = function(...fns) {
        for (const fn of fns) {
          if (typeof fn === 'function') {
            try { fn.call(window); } catch (e) {}
          }
        }
        return pbjsQue.length;
      };
      window.pbjs = {
        que: pbjsQue,
        requestBids: (obj) => {
          if (obj && typeof obj.bidsBackHandler === 'function') {
            try { obj.bidsBackHandler(); } catch (e) {}
          }
        },
        addAdUnits: noopFn,
        setTargetingForGPTAsync: noopFn
      };
    }

    // 4. Google AdSense (adsbygoogle)
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push = window.adsbygoogle.push || noopFn;

    // 5. Criteo Retargeting Queue
    window.criteo_q = window.criteo_q || [];
    window.criteo_q.push = window.criteo_q.push || function(...fns) {
      for (const fn of fns) { if (typeof fn === 'function') try { fn(); } catch (e) {} }
    };
  } catch (e) {}

  // ==========================================================================
  // SECTION 7: Hyperlink Ping Stripper
  // ==========================================================================
  try {
    window.addEventListener('click', (e) => {
      const link = e.target && e.target.closest ? e.target.closest('a') : null;
      if (link && link.hasAttribute('ping')) {
        link.removeAttribute('ping');
      }
    }, true);
  } catch (e) {}
})();
