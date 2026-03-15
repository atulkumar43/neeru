# 💧 Neeru — AI Water & Energy Footprint Extension

> *नीरू (Neeru) = water in Hindi*

A Chrome extension that makes the invisible visible — showing the real water and energy cost of every AI prompt, with India-specific data center context.

---

## What it does

Every time you send a prompt to Claude, ChatGPT, Gemini, or other AI tools:

- 💧 Shows **water consumption** in ml (India-adjusted: +22% for warm-climate cooling)
- ⚡ Shows **energy usage** in Wh
- ☁ Shows **CO₂ equivalent** using India's grid carbon intensity (0.71 kg CO₂/kWh)
- 📊 Accumulates a **session total** visible in a floating pill
- 🔍 Shows **real-life analogies** (drinking glasses, teaspoons, etc.)

---

## Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `ai-footprint-extension` folder
5. The Neeru icon (💧) will appear in your Chrome toolbar

---

## Supported platforms

| Platform | URL |
|----------|-----|
| Claude | claude.ai |
| ChatGPT | chat.openai.com / chatgpt.com |
| Gemini | gemini.google.com |
| Microsoft Copilot | copilot.microsoft.com |
| Perplexity | perplexity.ai |

---

## The science

### Water consumption
Based on data center **Water Usage Effectiveness (WUE)** of ~1.5, and Microsoft/Google disclosed figures of ~500ml per 20–50 prompts:

```
water_ml = energy_Wh × 0.5 × WUE(1.5)
india_water_ml = water_ml × 1.22
```

India's +22% multiplier accounts for the warmer ambient temperatures in data center hubs (Mumbai, Chennai, Hyderabad, Pune), which require more active evaporative cooling than cooler US/EU locations.

### Energy per token (approximate)
| Model | Wh per token |
|-------|-------------|
| GPT-4 / Claude Sonnet | 0.0006 Wh |
| GPT-3.5 / Claude Haiku | 0.00018 Wh |
| Gemini Pro | 0.0005 Wh |

These are estimates derived from disclosed compute requirements and industry PUE benchmarks.

### CO₂
India's electricity grid carbon intensity: **0.71 kg CO₂/kWh** (Central Electricity Authority, 2023) — nearly 2× the US average of ~0.38 kg CO₂/kWh.

---

## Why India?

India's data center industry is growing at **~20% annually**, with major expansion in:
- **Mumbai** — largest hub, ~40% of India's DC capacity
- **Chennai** — rapidly growing, coastal cooling advantages
- **Hyderabad** — government push, HITEC City
- **Pune** — proximity to Mumbai, lower land costs

India also faces **acute water stress** in many regions. Making AI's hidden water cost visible is critical here more than almost anywhere else.

---

## Privacy

- **No data leaves your browser.** All calculations are done locally.
- No prompt text is ever stored or transmitted.
- Session totals are stored locally in `chrome.storage.local`.

---

## Roadmap

- [ ] Per-model selection in popup
- [ ] India data center map overlay
- [ ] Export footprint report (PDF)
- [ ] Cumulative monthly/yearly projections
- [ ] Share card generator

---

## Sources

- Google Environmental Report 2023 (WUE, water disclosure)
- Microsoft Sustainability Report 2022
- Central Electricity Authority India — Grid Emission Factor 2023
- "Making AI Less 'Thirsty'" — Li et al., UC Riverside (2023)
- India Data Center Market Report — JLL, Cushman & Wakefield (2024)
