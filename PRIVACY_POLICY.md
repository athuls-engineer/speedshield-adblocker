# Privacy Policy for SpeedShield 🛡️

**Last Updated:** October 2026  
**Developer:** Athul S ([@athuls-engineer](https://github.com/athuls-engineer))  
**Repository:** [https://github.com/athuls-engineer/speedshield-adblocker](https://github.com/athuls-engineer/speedshield-adblocker)

---

## 🔒 Commitment to User Privacy

**SpeedShield** is built strictly as a client-side, privacy-first ad blocker and anti-fingerprinting shield. Your privacy is paramount:

### 1. No Data Collection
* SpeedShield does **NOT** collect, record, log, or monitor any personal information, browsing history, URLs, search terms, IP addresses, or device identifiers.
* All network request evaluation is handled natively within Chromium's C++ network core using the `declarativeNetRequest` API.

### 2. No Data Transmission
* SpeedShield does **NOT** communicate with any external analytics, telemetry, or tracking servers.
* No browsing metrics, blocked request counts, or performance logs ever leave your local computer.

### 3. Local Storage Only
* All user configurations (such as your custom whitelist, custom blocked domains, and blocked statistics) are stored strictly on your local machine using the browser's `chrome.storage.local` API.
* This data is never synchronized with any remote server.

### 4. Third-Party Services
* SpeedShield does not partner with or send data to any advertising networks, data brokers, or third parties.
* When checking for filter list updates, the extension retrieves public, static hostfiles directly from established open-source cybersecurity repositories without attaching any tracking cookies or user tokens.

### 5. Open Source Transparency
* SpeedShield's entire source code is 100% open-source and publicly auditable on GitHub.

---

## 📬 Contact

If you have questions or feedback regarding this Privacy Policy, please open an issue on the official GitHub repository:  
[https://github.com/athuls-engineer/speedshield-adblocker/issues](https://github.com/athuls-engineer/speedshield-adblocker/issues)
