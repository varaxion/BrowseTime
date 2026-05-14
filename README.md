<div align="center">
  <h1>BrowseTime</h1>
  <p><em>Privacy-first browser awareness. Track time, not people.</em></p>
  
  <p>
    <img src="https://img.shields.io/badge/Architecture-Manifest%20V3-blue?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome MV3" />
    <img src="https://img.shields.io/badge/Stack-Vanilla%20JS-yellow?style=for-the-badge&logo=javascript&logoColor=black" alt="Vanilla JS" />
    <img src="https://img.shields.io/badge/Data-100%25%20Local-brightgreen?style=for-the-badge&logo=databricks&logoColor=white" alt="Local Data" />
  </p>
</div>

> 🚧 **[ STATUS: ACTIVE DEVELOPMENT ]**  
> BrowseTime is currently an actively evolving project. Expect rapid architectural updates, expanded tracking logic, and new glassmorphic UI features in upcoming iterations.

<br />

## ⚡ Overview

**BrowseTime** is a lightweight, privacy-focused Chrome extension engineered to precisely monitor your active browser usage. It operates on a strict **"active attention"** philosophy—tracking time only when you are genuinely focused on a website. With zero telemetry, zero cloud sync, and ephemeral local storage, BrowseTime ensures your data belongs exclusively to you and vanishes the moment your browser closes.

<br />

## 🚀 System Features

- 🎯 **Surgical Accuracy:** Intelligently pauses tracking when the browser is minimized, loses OS focus, or when you step away from your keyboard.
- 🎧 **Media Awareness:** Fully aware of your media consumption. Watching a long video without touching the mouse? BrowseTime tracks the tab's `audible` state to ensure your time is logged seamlessly.
- 🔮 **Glassmorphic Cyber UI:** A stunning, hacker-inspired live monitoring dashboard featuring animated deep mesh gradients, frosted glass panels, and glowing neon typography.
- ⚡ **Real-Time Dynamic Sorting:** Butter-smooth live rendering allows you to dynamically sort tracked domains by `Time (Desc)`, `Time (Asc)`, or `A-Z` without interrupting the live ticker.
- 🛡️ **Absolute Privacy:** Utilizes Manifest V3's volatile `chrome.storage.session`. No persistent databases, no tracking cookies, and absolutely **no external network requests**.

<br />

## 🛠️ Technology Stack

| Category | Technology |
| :--- | :--- |
| **Architecture** | Chrome Extension Manifest V3 |
| **Logic** | Vanilla JavaScript (ES6+) |
| **Styling** | Custom CSS3 (Backdrop-filters, CSS variables, Keyframes) |
| **APIs** | `tabs`, `windows`, `idle`, `storage.session`, `runtime` |

<br />

## ⚙️ Core Architecture

The BrowseTime engine runs purely in the background via a sophisticated, race-condition-immune state machine:

1. **Focus Tracking:** Listens to OS-level window transitions to guarantee the browser is actively targeted.
2. **Idle Detection:** Leverages the `chrome.idle` API to detect system idleness.
3. **State Management:** Aggregates elapsed time against the active domain and securely caches the session asynchronously. 
4. **Popup Bridge:** When the stats panel is opened, an active `chrome.runtime.Port` establishes a direct connection to guarantee the background tracker accurately evaluates focus states.

<br />

## 💻 Developer Installation

1. Clone this repository to your local machine.
2. Open Chrome/Chromium and navigate to `chrome://extensions/`.
3. Enable **Developer mode** via the toggle in the top right.
4. Click **Load unpacked** and select the root `BrowseTime` directory.
5. Pin the extension to your toolbar and initialize the monitoring!

<br />
<br />

<div align="center">
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/aqua.png" width="400" alt="cyan glowing line separator" />
  <br /><br />
  <code><b>[ SYS.BROWSETIME ]</b></code>
  <br />
  <h3>✦ Engineered by <a href="https://github.com/varaxion">Varaxion</a> ✦</h3>
  <br />
  <img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/aqua.png" width="400" alt="cyan glowing line separator" />
</div>
