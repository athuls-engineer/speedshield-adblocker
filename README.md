# SpeedShield AdBlocker

**Lightweight Manifest V3 Ad & Tracker Blocker for Chromium Browsers.**

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg?style=flat-square)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

SpeedShield is an open-source browser extension built for modern Chromium browsers (Chrome, Brave, Edge, Opera) adhering to Chrome Extension Manifest V3 standards.

It utilizes the browser's native `declarativeNetRequest` engine to block network requests to known ad servers and trackers before they are loaded, keeping CPU and memory overhead minimal.

---

## ⚡ Features

* **Declarative Net Request Engine**: Uses Chromium's native rule engine with 700+ curated rules across 5 rule sets (ads, trackers, popups, annoyances, url-cleaner).
* **Cosmetic Filtering**: Hides leftover empty ad slots and dismisses common modal overlays.
* **URL Parameter Cleaner**: Automatically strips common marketing tracking parameters (`utm_*`, `fbclid`, `gclid`) from visited URLs.
* **Zero Persistent Background Worker**: Does not run an ongoing background loop; relies on event-driven service workers for minimal RAM consumption.

---

## 📥 Installation (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/athuls-engineer/speedshield-adblocker.git
   ```
2. Open your browser's extension page:
   * Chrome / Brave: `chrome://extensions/`
   * Edge: `edge://extensions/`
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the `speedshield-adblocker` folder.

---

## 🤝 Authors & Contributors

* **Athul S** ([@athuls-engineer](https://github.com/athuls-engineer)) — Creator & Extension Developer
* **Google Gemini** (AI Pair Programmer) — Co-developer assisting with rule JSON construction, service worker architecture, and Manifest V3 migration.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
