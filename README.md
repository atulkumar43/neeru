# 💧 Neeru — AI Water & Energy Footprint

> *नीरू (Neeru) = water in Hindi*

**A Chrome extension that makes the invisible visible** — showing the real water and energy cost of every AI prompt, with India-specific data center context.

![Neeru Badge Demo](https://img.shields.io/badge/version-1.0.0-5DCAA5?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-orange?style=flat-square) ![India](https://img.shields.io/badge/🇮🇳-India%20Context-blue?style=flat-square)

---

## The Problem

Every time you send a prompt to an AI chatbot, data centers consume real water and electricity to process it. This cost is **completely invisible** to the user.

In India, this matters more than almost anywhere else:
- India's data center industry is growing at **~20% annually**
- India's electricity grid emits **0.71 kg CO₂/kWh** — nearly 2× the US average
- Indian data centers use **22% more water** than global averages due to warm-climate cooling needs (Mumbai, Chennai, Hyderabad, Pune)
- India faces **acute water stress** in many regions — Chennai's 2019 crisis saw residents rationed to 2L/day

Neeru surfaces this hidden cost — in real time, in every chat.

---

## What It Does

After every AI prompt, Neeru injects a badge beneath the response showing:

| Metric | Description |
|--------|-------------|
| 💧 Water | ml consumed (India-adjusted +22%) |
| ⚡ Energy | Wh of electricity used |
| ☁ CO₂ | grams of CO₂ equivalent |
| 📊 Comparisons | cups of chai, drinking glasses, % of Chennai crisis daily water |

**Additional features:**
- 🌊 **Floating session tally** — running total in the bottom-right corner, clickable to open share card
- 🔴 **Thirst Mode warnings** — banners fire at 500ml, 1000ml, and 2000ml with escalating alerts
- ↗ **Share card** — copy your footprint as formatted text to share on social media
- 📊 **Popup dashboard** — session + all-time totals, comparison grid, thirst bar, settings

---

## Screenshots

```
┌─────────────────────────────────────────┐
│ neeru  Claude · India              ✕    │
├─────────────────────────────────────────┤
│  💧 42 ml    ⚡ 0.06 Wh    ☁ 0.04g     │
│                                         │
│  ≈ 0.3 cups of chai ☕                  │
│  💧💧💧💧💧💧💧💧💧💧💧💧               │
│                                         │
│  ☕ 0.3 cups of chai (session)          │
│  🥛 0.17 drinking glasses (session)     │
│                                         │
│  Session: 42 ml · 1 prompt  ↗ Share    │
└─────────────────────────────────────────┘
```

---

## Supported Platforms

| Platform | URL |
|----------|-----|
| ✅ Claude | claude.ai |
| ✅ ChatGPT | chat.openai.com / chatgpt.com |
| ✅ Gemini | gemini.google.com |
| ✅ Microsoft Copilot | copilot.microsoft.com |
| ✅ Perplexity | perplexity.ai |

---

## Installation

### From Source (Developer Mode)

1. **Clone the repository**
   ```bash
   git clone https://github.com/atulkumar43/neeru.git
   cd neeru
   ```

2. **Open Chrome** and navigate to `chrome://extensions/`

3. **Enable Developer mode** (toggle in top-right corner)

4. **Click "Load unpacked"** and select the `ai-footprint-extension` folder

5. **Pin the extension** — click the 🧩 puzzle icon in Chrome toolbar → pin Neeru

6. **Visit any supported AI site** and start chatting — the 💧 badge will appear after each response

---

## How It Works

### Prompt Detection (4 strategies)

Neeru uses four simultaneous detection strategies to ensure it never misses a prompt:

1. **Wide-net button listener** — scans all buttons near input boxes, binds to anything that looks like a Send button
2. **Keyboard Enter listener** — fires in capture phase before the site's own handlers
3. **DOM mutation watcher** — detects when new AI response nodes appear in the DOM
4. **Input cleared detector** — polls every 300ms; when the text box goes from populated → empty, a prompt was sent

### Water Calculation

```
prompt text
    ↓
word count × 1.33 = input tokens
input tokens × 2.8 = estimated output tokens
    ↓
total tokens × energy_per_token (Wh)
    ↓
energy × 0.5 × WUE(1.5) = water_ml
    ↓
water_ml × 1.22 = india_water_ml  ← +22% warm-climate cooling
```

### Energy per Token (by model)

| Model | Wh per token |
|-------|-------------|
| Claude Sonnet | 0.00055 Wh |
| GPT-4 | 0.00060 Wh |
| Gemini Pro | 0.00050 Wh |
| GPT-3.5 | 0.00018 Wh |

### CO₂ Calculation

```
CO₂ (g) = (energy_Wh / 1000) × 710  
           ↑ India grid: 0.71 kg CO₂/kWh (CEA 2023)
```

### Thirst Mode Thresholds

| Threshold | Level | Alert |
|-----------|-------|-------|
| 500 ml | 🟡 Warn | Thirst mode active |
| 1,000 ml | 🟠 Alert | High water use |
| 2,000 ml | 🔴 Danger | Critical — equals 1 person's crisis daily water |

---

## The India Context

### Why 22% more water?

India's major data center hubs — **Mumbai**, **Chennai**, **Hyderabad**, **Pune** — experience ambient temperatures of 25–40°C year-round. Data centers use evaporative cooling (water) to manage heat. The hotter the outside air, the more water evaporates to cool the servers. This makes Indian data centers inherently more water-intensive than those in cooler climates like Oregon or Ireland.

### Why Chennai as the benchmark?

During Chennai's 2019 water crisis, the city's four main reservoirs ran completely dry. Residents were rationed to approximately **2 litres of drinking water per person per day**. Neeru uses this as a human benchmark: when your AI session crosses 2,000 ml, you've consumed what one person had to survive on for a day during one of India's most severe urban water crises.

### India's Grid Carbon Intensity

India's electricity grid emits **0.71 kg CO₂ per kWh** (Central Electricity Authority, 2023). For comparison:
- USA: ~0.38 kg CO₂/kWh
- EU average: ~0.23 kg CO₂/kWh
- France (nuclear-heavy): ~0.05 kg CO₂/kWh

This means the same AI prompt has nearly **2× the carbon footprint** when processed in an Indian data center vs. the US.

---

## Project Structure

```
ai-footprint-extension/
├── manifest.json          # Chrome extension manifest v3
├── content.js             # Main content script — prompt detection + badge injection
├── content.css            # Styles for inline badge + floating tally pill
├── background.js          # Service worker — session reset, storage management
├── popup/
│   ├── popup.html         # Extension toolbar popup
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic — loads stats, settings, share
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Privacy

- ✅ **All computation is 100% local** — nothing leaves your browser
- ✅ **No prompt text is stored** — only word counts are used, then discarded
- ✅ **No tracking, no analytics, no telemetry**
- ✅ **No external API calls**
- ✅ Session data stored only in `chrome.storage.local` on your device

---

## Data Sources

| Data Point | Source |
|------------|--------|
| Water Usage Effectiveness (WUE) | Google Environmental Report 2023 |
| ~500ml per 20–50 prompts baseline | Microsoft AI Water Disclosure 2023 |
| India grid carbon intensity 0.71 kg/kWh | Central Electricity Authority (CEA), 2023 |
| India DC warm-climate multiplier | "Making AI Less Thirsty" — Li et al., UC Riverside (2023) |
| Chennai crisis water ration (2L/day) | The Hindu, BBC News — Chennai Water Crisis 2019 |
| India DC growth rate ~20%/yr | JLL India Data Center Report 2024 |

---

## Roadmap

- [ ] Per-conversation tracking (detect new chat vs. continued chat)
- [ ] Response token counting (more accurate — read AI output length too)
- [ ] India data center map (which city likely processed your prompt)
- [ ] Weekly/monthly PDF footprint report
- [ ] Multi-city India comparisons (Mumbai vs Chennai vs rural)
- [ ] Chrome Web Store release

---

## Contributing

Pull requests are welcome! If you want to improve accuracy of the water/energy estimates, please open an issue first to discuss methodology — the science should be transparent and sourced.

```bash
git clone https://github.com/atulkumar43/neeru.git
# Make your changes
# Load unpacked in chrome://extensions/ to test
# Open a PR with sources for any methodology changes
```

---

## License

MIT — see [LICENSE](LICENSE)

---

## Acknowledgements

Built as part of a broader project to surface the **transparency gap** around AI's physical infrastructure costs — specifically within India's expanding data center landscape. The goal is not to discourage AI use, but to make the invisible visible so users can make informed, conscious choices.

> *"The water used per prompt in an Indian data center is estimated to be 15–30% higher than global averages due to warmer ambient temperatures requiring more cooling."*

---

<p align="center">
  Made with 💧 in India · By Atul Kumar <a href="https://jalshakti-dowr.gov.in">Learn about India's water crisis</a>
</p>
