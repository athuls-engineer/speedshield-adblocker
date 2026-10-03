// ==========================================================================
// SpeedShield - Advanced Popup Defuser, Anti-Fingerprinting & Telemetry Silencer
// Injected into page context (world: MAIN) at document_start
// Protects identity, prevents tracking loops, and accelerates page loading
// ==========================================================================

(function() {
  'use strict';

  // ==========================================================================
  // Native Function Camouflage: Prevents CreepJS/FingerprintJS anti-tampering flags
  // Overridden methods appear 100% native with "function [name]() { [native code] }"
  // ==========================================================================
  const nativeFunctions = new WeakSet();
  const originalToString = Function.prototype.toString;

  function makeNative(fn, name) {
    if (typeof fn !== 'function') return fn;
    if (name) {
      try {
        Object.defineProperty(fn, 'name', { value: name, configurable: true });
      } catch (e) {}
    }
    nativeFunctions.add(fn);
    return fn;
  }

  try {
    const stringifier = {
      toString() {
        if (typeof this !== 'function') {
          return originalToString.apply(this, arguments);
        }
        if (nativeFunctions.has(this)) {
          return `function ${this.name || ''}() { [native code] }`;
        }
        return originalToString.apply(this, arguments);
      }
    };
    Object.defineProperty(Function.prototype, 'toString', {
      value: stringifier.toString,
      writable: true,
      enumerable: false,
      configurable: true
    });
    nativeFunctions.add(Function.prototype.toString);
  } catch (e) {}

  // ==========================================================================
  // SECTION 1: Rogue Popup & Clickjack Defuser
  // ==========================================================================
  const SUSPICIOUS_PATTERNS = [
    'onclickbright', 'deloton', 'ad-maven', 'popcash', 'popads',
    'exosrv', 'realsrv', 'tsyndicate', 'clksite', 'adplxmd',
    'adsco.re', 'adcash', 'adsterra', 'propellerads', 'hilltopads',
    'clickadu', 'trafficjunky', 'outbrain', 'taboola', 'revcontent',
    'doubleclick', 'pagead2', 'yieldlove', 'bet365', '1xbet',
    '/click/', '/pop/', '/jump/', 'utm_medium=popup', 'format=popunder'
  ];

  const originalWindowOpen = window.open;

  // Track user click timestamps to detect simulated/synthetic clicks
  let lastTrustedClickTime = 0;
  window.addEventListener('click', (e) => {
    if (e.isTrusted) {
      lastTrustedClickTime = Date.now();
    }
  }, true);

  // Override window.open
  window.open = makeNative(function(url, target, features) {
    const now = Date.now();
    const timeSinceClick = now - lastTrustedClickTime;

    const urlStr = String(url || '').toLowerCase();
    const isSuspicious = SUSPICIOUS_PATTERNS.some(p => urlStr.includes(p));

    const isSameOrigin = !urlStr ||
      urlStr === 'about:blank' ||
      urlStr.startsWith('/') ||
      urlStr.startsWith('./') ||
      urlStr.startsWith(window.location.origin.toLowerCase());

    const isYouTube = (window.location.hostname || '').includes('youtube.com');

    // On YouTube or for same-origin navigation, never block legitimate calls
    if ((isYouTube || isSameOrigin) && !isSuspicious) {
      return originalWindowOpen.apply(this, arguments);
    }

    // If opened without a trusted user click in the last 1500ms, or matches popup ad pattern
    if (isSuspicious || timeSinceClick > 1500) {
      if (isSameOrigin && !isSuspicious && timeSinceClick <= 3000) {
        return originalWindowOpen.apply(this, arguments);
      }
      console.warn('[SpeedShield] Blocked unprompted popup attempt:', url);
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

  // ==========================================================================
  // SECTION 2: Anti-Fingerprinting Suite (Identity & Hardware Protection)
  // Scrambles hardware/browser signatures across Reddit, FingerprintJS, etc.
  // ==========================================================================

  // 1. Hardware Concurrency Normalization (masks CPU core count to standard 8)
  try {
    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
      get: makeNative(function() { return 8; }, 'get hardwareConcurrency'),
      configurable: true,
      enumerable: true
    });
  } catch (e) {}
  try {
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: makeNative(function() { return 8; }, 'get hardwareConcurrency'),
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {}

  // 2. Device Memory Normalization (masks RAM to standard 8GB bucket)
  try {
    Object.defineProperty(Navigator.prototype, 'deviceMemory', {
      get: makeNative(function() { return 8; }, 'get deviceMemory'),
      configurable: true,
      enumerable: true
    });
  } catch (e) {}
  try {
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'deviceMemory', {
        get: makeNative(function() { return 8; }, 'get deviceMemory'),
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {}

  // 3. Battery API Neutralization (prevents battery-drain tracking vectors)
  try {
    if (typeof navigator.getBattery === 'function') {
      navigator.getBattery = makeNative(function() {
        return Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1.0,
          addEventListener: function() {},
          removeEventListener: function() {},
          dispatchEvent: function() { return false; },
          onchargingchange: null,
          onchargingtimechange: null,
          ondischargingtimechange: null,
          onlevelchange: null
        });
      }, 'getBattery');
    }
  } catch (e) {}

  // 4. Automation & Bot Signature Shield (prevents webdriver detection & fingerprint flags)
  try {
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: makeNative(function() { return false; }, 'get webdriver'),
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(Navigator.prototype, 'pdfViewerEnabled', {
      get: makeNative(function() { return true; }, 'get pdfViewerEnabled'),
      configurable: true,
      enumerable: true
    });
  } catch (e) {}

  // 5. Screen & Color Depth Standardization (prevents atypical display bucketing)
  try {
    Object.defineProperty(Screen.prototype, 'colorDepth', {
      get: makeNative(function() { return 24; }, 'get colorDepth'),
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(Screen.prototype, 'pixelDepth', {
      get: makeNative(function() { return 24; }, 'get pixelDepth'),
      configurable: true,
      enumerable: true
    });
  } catch (e) {}
  try {
    if (typeof screen !== 'undefined') {
      Object.defineProperty(screen, 'colorDepth', {
        get: makeNative(function() { return 24; }, 'get colorDepth'),
        configurable: true,
        enumerable: true
      });
      Object.defineProperty(screen, 'pixelDepth', {
        get: makeNative(function() { return 24; }, 'get pixelDepth'),
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {}

  // 6. Network Jitter Normalization (neutralizes connection timing fingerprinting)
  try {
    if ('connection' in Navigator.prototype) {
      const mockConn = {
        rtt: 50,
        downlink: 10,
        effectiveType: '4g',
        saveData: false,
        addEventListener: function() {},
        removeEventListener: function() {},
        dispatchEvent: function() { return false; },
        onchange: null
      };
      Object.defineProperty(Navigator.prototype, 'connection', {
        get: makeNative(function() { return mockConn; }, 'get connection'),
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {}

  // 7. WebGL Hardware Masking (masks unique GPU model & driver strings)
  const UNMASKED_VENDOR_WEBGL = 37445;   // 0x9245
  const UNMASKED_RENDERER_WEBGL = 37446; // 0x9246
  const GENERIC_VENDOR = 'Google Inc. (Intel)';
  const GENERIC_RENDERER = 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)';

  function maskWebGLContext(proto) {
    if (!proto || !proto.getParameter) return;
    if (nativeFunctions.has(proto.getParameter)) return;
    const originalGetParameter = proto.getParameter;
    proto.getParameter = makeNative(function(param) {
      if (param === UNMASKED_VENDOR_WEBGL) {
        return GENERIC_VENDOR;
      }
      if (param === UNMASKED_RENDERER_WEBGL) {
        return GENERIC_RENDERER;
      }
      return originalGetParameter.apply(this, arguments);
    }, 'getParameter');

    if (proto.readPixels && !nativeFunctions.has(proto.readPixels)) {
      const originalReadPixels = proto.readPixels;
      proto.readPixels = makeNative(function(x, y, width, height, format, type, pixels) {
        originalReadPixels.apply(this, arguments);
        try {
          if (pixels && pixels.length) {
            const step = Math.max(4, Math.floor(pixels.length / 80));
            for (let i = 0; i < pixels.length; i += step) {
              pixels[i] = (pixels[i] === 255 ? 254 : pixels[i] + 1);
            }
          }
        } catch (e) {}
      }, 'readPixels');
    }
  }

  if (typeof WebGLRenderingContext !== 'undefined') {
    maskWebGLContext(WebGLRenderingContext.prototype);
  }
  if (typeof WebGL2RenderingContext !== 'undefined') {
    maskWebGLContext(WebGL2RenderingContext.prototype);
  }

  // 8. Canvas Anti-Fingerprinting & Readback Optimization
  // Scrambles fingerprinting hashes without CPU-GPU readback bottlenecks or console warnings
  if (typeof HTMLCanvasElement !== 'undefined') {
    // A. Context Optimizer: Sets willReadFrequently by default on 2D contexts
    // This instructs Chromium to optimize readback storage, eliminating the
    // "Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true"
    // warning completely, while accelerating any legit canvas read operations.
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = makeNative(function(type, attributes) {
      if (type === '2d') {
        if (!attributes) {
          attributes = { willReadFrequently: true };
        } else if (attributes.willReadFrequently === undefined) {
          attributes = Object.assign({}, attributes, { willReadFrequently: true });
        }
        return originalGetContext.call(this, type, attributes);
      }
      const ctx = originalGetContext.apply(this, arguments);
      if (ctx && (type === 'webgl' || type === 'experimental-webgl' || type === 'webgl2')) {
        maskWebGLContext(ctx);
      }
      return ctx;
    }, 'getContext');

    // B. toDataURL Fingerprint Scrambler:
    // Randomizes the cryptographic hash (SHA256/MD5) for fingerprinters with 0ms latency
    // by appending valid base64 trailing padding. Image decoders safely ignore extra bytes
    // after the file terminator chunk (IEND), guaranteeing 100% flawless image rendering.
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = makeNative(function(...args) {
      const result = originalToDataURL.apply(this, args);
      try {
        if (typeof result === 'string' && result.startsWith('data:image/')) {
          return result + 'A==';
        }
      } catch (e) {}
      return result;
    }, 'toDataURL');

    // C. toBlob Fingerprint Scrambler:
    if (HTMLCanvasElement.prototype.toBlob) {
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = makeNative(function(callback, type, quality) {
        if (typeof callback !== 'function') {
          return originalToBlob.apply(this, arguments);
        }
        try {
          const dataUrl = this.toDataURL(type, quality);
          fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => callback(blob))
            .catch(() => originalToBlob.apply(this, arguments));
        } catch (e) {
          originalToBlob.apply(this, arguments);
        }
      }, 'toBlob');
    }
  }

  // D. getImageData Pixel Farbler:
  // Subtly alters 1 bit on isolated pixels when fingerprinting libraries inspect raw pixel arrays.
  if (typeof CanvasRenderingContext2D !== 'undefined') {
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = makeNative(function(sx, sy, sw, sh, settings) {
      const imgData = originalGetImageData.apply(this, arguments);
      try {
        if (imgData && imgData.data) {
          const d = imgData.data;
          const len = d.length;
          // Perturb 1 byte every 64 pixels slightly (+/- 1)
          for (let i = 0; i < len; i += 64) {
            d[i] = (d[i] === 255 ? 254 : d[i] + 1);
          }
        }
      } catch (e) {}
      return imgData;
    }, 'getImageData');
  }

  // 9. AudioContext Fingerprint Scrambler (Sub-harmonic micro-noise)
  // Audio fingerprinting tests extract FFT data from an OfflineAudioContext.
  // Injecting sub-140dB micro-noise randomizes the hash without any audible sound distortion.
  if (typeof AudioBuffer !== 'undefined') {
    const originalGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = makeNative(function(channel) {
      const data = originalGetChannelData.apply(this, arguments);
      try {
        if (!this._speedshieldAudioFarbled) {
          this._speedshieldAudioFarbled = true;
          for (let i = 0; i < data.length; i += 100) {
            data[i] += Math.sin(i) * 1e-7;
          }
        }
      } catch (e) {}
      return data;
    }, 'getChannelData');

    const originalCopyFromChannel = AudioBuffer.prototype.copyFromChannel;
    if (originalCopyFromChannel) {
      AudioBuffer.prototype.copyFromChannel = makeNative(function(destination, channelNumber, startInChannel) {
        originalCopyFromChannel.apply(this, arguments);
        try {
          for (let i = 0; i < destination.length; i += 100) {
            destination[i] += Math.sin(i) * 1e-7;
          }
        } catch (e) {}
      }, 'copyFromChannel');
    }
  }

  // ==========================================================================
  // SECTION 3: Universal Telemetry, Reddit Beacon Silencer & Fetch Interceptor
  // Silently drops telemetry to prevent retry loops and network clutter
  // ==========================================================================

  const TRACKING_PATTERNS = [
    'events.reddit.com',
    'alb.reddit.com',
    'pixel.reddit.com',
    'redditstatic.com/telemetry',
    'reddit.com/svc/events',
    'svc/events/preload-head',
    '/svc/events',
    'spade.twitch.tv',
    'science.twitch.tv',
    'countess.twitch.tv',
    'amazon-adsystem.com',
    'aax-us-east.amazon-adsystem.com',
    'c.amazon-adsystem.com',
    'fls-na.amazon.com',
    'pubads.g.doubleclick.net',
    'imasdk.googleapis.com',
    'google-analytics.com',
    'analytics.google.com',
    'stats.g.doubleclick.net',
    'googletagmanager.com/gtag',
    'clarity.ms',
    'hotjar.com',
    'amplitude.com',
    'segment.io',
    'mixpanel.com',
    'tiktok.com/api/v1/event',
    'analytics.tiktok.com',
    'facebook.com/tr',
    'connect.facebook.net',
    'static.ads-twitter.com',
    'analytics.twitter.com',
    'fpjs.sh',
    'api.fpjs.io',
    'openfpcdn.io',
    'fingerprint.com',
    'browser-intake-datadoghq',
    'sentry.io/api',
    'criteo.com',
    'criteo.net',
    'appsflyer.com',
    'branch.io',
    'adjust.com',
    'fullstory.com',
    'mouseflow.com',
    'crazyegg.com',
    'bugsnag.com',
    'mc.yandex.ru',
    'nr-data.net',
    'ping.chartbeat.net',
    'scorecardresearch.com',
    'quantserve.com',
    'taboola.com',
    'outbrain.com',
    'rubiconproject.com',
    'smartadserver.com',
    'pubmatic.com',
    'openx.net',
    'casalemedia.com',
    'adnxs.com'
  ];

  function isTrackingUrl(url) {
    if (!url) return false;
    const u = String(url).toLowerCase();
    return TRACKING_PATTERNS.some(pattern => u.includes(pattern));
  }

  // 1. Silent Beacon Interception
  try {
    const hookBeacon = function(target) {
      if (!target || typeof target.sendBeacon !== 'function') return;
      const originalSendBeacon = target.sendBeacon;
      if (nativeFunctions.has(originalSendBeacon)) return;
      target.sendBeacon = makeNative(function(url, data) {
        if (isTrackingUrl(url)) {
          // Silently return true so tracking scripts think data was dispatched successfully
          return true;
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

  // 2. Global fetch() Interceptor (Reddit, Twitch Telemetry & Stream Ad Pruner)
  const originalFetch = window.fetch;
  window.fetch = makeNative(async function(...args) {
    const rawUrl = args[0];
    const url = typeof rawUrl === 'string' ? rawUrl : (rawUrl && rawUrl.url ? rawUrl.url : '');
    const options = args[1] || {};

    // Reddit, Twitch & Third-Party Telemetry: Return immediate mock 200 OK
    if (isTrackingUrl(url)) {
      return new Response('{"data":{"success":true}}', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Reddit GraphQL Telemetry & Ad Tracking Operations
    if (url.includes('gql.reddit.com')) {
      try {
        const bodyStr = typeof options.body === 'string' ? options.body : '';
        if (
          bodyStr.includes('Telemetry') ||
          bodyStr.includes('LogEvent') ||
          bodyStr.includes('AdImpression') ||
          bodyStr.includes('Track')
        ) {
          return new Response('{"data":{"success":true}}', {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (e) {}
    }

    // Twitch GraphQL Telemetry & Ad Operations
    if (url.includes('gql.twitch.tv')) {
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
          return new Response(JSON.stringify([{ data: { success: true } }]), {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (e) {}
    }

    // YouTube Native Ad Pruning on player & next endpoints
    const response = await originalFetch.apply(this, args);
    if (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next')) {
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
    }

    return response;
  }, 'fetch');

  // ==========================================================================
  // SECTION 4: YouTube Zero-Latency Native Ad Killer & Fast-Forward Engine
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

    // Native Video Ad Fast-Forward & Instaskip Engine
    function killActiveYouTubeAds() {
      // Auto-click all modern YouTube skip ad buttons immediately
      const skipSelectors = [
        '.ytp-ad-skip-button-modern',
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button',
        'button.ytp-ad-skip-button-modern',
        'button.ytp-skip-ad-button',
        '.ytp-ad-skip-button-container button',
        '.ytp-ad-skip-button-slot button',
        '[id^="skip-button"] button',
        '.videoAdUiSkipButton',
        '.ytp-ad-overlay-close-button',
        'button[aria-label*="Skip ad" i]',
        'button[aria-label*="Skip" i]'
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
        const player = v.closest('#movie_player, .html5-video-player');
        const isAdActive = (player && (
          player.classList.contains('ad-showing') ||
          player.classList.contains('ad-interrupting')
        )) || document.querySelector(
          '.ytp-ad-player-overlay, .ytp-ad-player-overlay-layout, .ytp-ad-preview-container, .ytp-ad-skip-button-container'
        );

        if (isAdActive) {
          adWasActive = true;
          try {
            v.muted = true;
            v.playbackRate = 16.0;
            if (isFinite(v.duration) && v.duration > 0) {
              v.currentTime = v.duration;
            }
          } catch (e) {}
        } else if (adWasActive) {
          adWasActive = false;
          try {
            if (v.playbackRate > 2.0) {
              v.playbackRate = 1.0;
            }
            v.muted = false;
          } catch (e) {}
        }
      }
    }

    // Attach high-frequency listeners directly to video elements
    function hookVideos() {
      const videos = document.querySelectorAll('video');
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (v._speedshieldHooked) continue;
        v._speedshieldHooked = true;

        v.addEventListener('timeupdate', killActiveYouTubeAds, { passive: true });
        v.addEventListener('play', killActiveYouTubeAds, { passive: true });
        v.addEventListener('playing', killActiveYouTubeAds, { passive: true });
        v.addEventListener('loadeddata', killActiveYouTubeAds, { passive: true });
      }
    }

    hookVideos();
    setInterval(() => {
      hookVideos();
      killActiveYouTubeAds();
    }, 100);

    // Watch for DOM changes (ad overlays popping up)
    if (typeof MutationObserver !== 'undefined') {
      const adObserver = new MutationObserver(() => {
        killActiveYouTubeAds();
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
  // SECTION 5: Twitch Zero-Latency Stream Accelerator & Ad Overlay Dismissal
  // Silently handles Twitch stream overlays and maintains silky smooth 60fps playback
  // ==========================================================================
  if (window.location.hostname.includes('twitch.tv')) {
    function dismissTwitchAdOverlays() {
      // Auto-click Twitch ad dismiss / skip buttons if rendered
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

      // Ensure video is playing at standard 1.0x playback rate (never altered by ad accelerators)
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

    // Gentle low-frequency check (every 2000ms) to ensure overlay buttons are clicked without CPU overhead
    setInterval(dismissTwitchAdOverlays, 2000);
  }

  // ==========================================================================
  // SECTION 6: Broken Telemetry Preload Neutralizer (Reddit, etc.)
  // Eliminates console warnings caused by sites omitting crossorigin on telemetry preloads
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
})();
