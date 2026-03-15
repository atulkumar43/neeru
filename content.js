// Neeru v4 — Robust prompt detection
// Strategy: instead of relying on specific button selectors (which break when sites update),
// we watch for DOM changes that indicate a new message was sent + use multiple fallbacks.

(function () {
  'use strict';

  // ── Platform config ──
  const PLATFORMS = {
    'claude.ai': {
      name: 'Claude', model: 'claude_sonnet',
      inputSelectors: ['div[contenteditable="true"][data-placeholder]', 'div[contenteditable="true"]', 'textarea'],
      responseSelectors: ['.font-claude-message', '[data-testid="chat-message-content"]', '.prose'],
      newMessageSelectors: ['.font-claude-message', '[data-testid="chat-message-content"]'],
    },
    'chat.openai.com': {
      name: 'ChatGPT', model: 'gpt4',
      inputSelectors: ['#prompt-textarea', 'div[contenteditable="true"]', 'textarea'],
      responseSelectors: ['[data-message-author-role="assistant"] .markdown', '[data-message-author-role="assistant"]'],
      newMessageSelectors: ['[data-message-author-role="assistant"]'],
    },
    'chatgpt.com': {
      name: 'ChatGPT', model: 'gpt4',
      inputSelectors: ['#prompt-textarea', 'div[contenteditable="true"]', 'textarea'],
      responseSelectors: ['[data-message-author-role="assistant"] .markdown', '[data-message-author-role="assistant"]'],
      newMessageSelectors: ['[data-message-author-role="assistant"]'],
    },
    'gemini.google.com': {
      name: 'Gemini', model: 'gemini_pro',
      inputSelectors: ['div[contenteditable="true"]', 'rich-textarea div[contenteditable]', 'textarea'],
      responseSelectors: ['.model-response-text', '.response-content'],
      newMessageSelectors: ['.model-response-text'],
    },
    'copilot.microsoft.com': {
      name: 'Copilot', model: 'gpt4',
      inputSelectors: ['textarea', 'div[contenteditable="true"]'],
      responseSelectors: ['.ac-textBlock', '[data-content="ai-message"]'],
      newMessageSelectors: ['.ac-textBlock'],
    },
    'www.perplexity.ai': {
      name: 'Perplexity', model: 'gpt4',
      inputSelectors: ['textarea'],
      responseSelectors: ['.prose', '.answer'],
      newMessageSelectors: ['.prose'],
    },
  };

  const host = window.location.hostname;
  const platform = PLATFORMS[host];
  if (!platform) return;

  // ── Cost model ──
  const MODELS = {
    claude_sonnet: { whPerToken: 0.00055 },
    gpt4:          { whPerToken: 0.00060 },
    gpt35:         { whPerToken: 0.00018 },
    gemini_pro:    { whPerToken: 0.00050 },
  };

  const WUE = 1.5, INDIA_MULT = 1.22, GRID_CI = 0.71, ML_PER_WH = 0.5;
  const THIRST_WARN = 500, THIRST_ALERT = 1000, THIRST_DANGER = 2000;
  const CHAI_ML = 150, GLASS_ML = 250, CHENNAI_ML = 2000, SHOWER_ML = 60000;

  function estimateTokens(text) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const input  = Math.max(8, Math.round(words * 1.33));
    const output = Math.round(input * 2.8);
    return input + output;
  }

  function computeCost(text) {
    const model  = MODELS[platform.model] || MODELS.gpt4;
    const tokens = estimateTokens(text);
    const wh     = tokens * model.whPerToken;
    const waterMl       = wh * ML_PER_WH * WUE;
    const indiaWaterMl  = waterMl * INDIA_MULT;
    const co2g          = (wh / 1000) * GRID_CI * 1000;
    return {
      wh:           Math.round(wh * 1000) / 1000,
      indiaWaterMl: Math.round(indiaWaterMl * 10) / 10,
      co2g:         Math.round(co2g * 100) / 100,
    };
  }

  function fmtWater(ml) {
    if (ml >= 1000) return (ml / 1000).toFixed(2) + ' L';
    if (ml >= 1)    return Math.round(ml) + ' ml';
    return (ml * 10).toFixed(1) + ' cl';
  }

  function getAnalogy(ml) {
    if (ml >= SHOWER_ML)  return '≈ ' + (ml/SHOWER_ML).toFixed(3)  + ' showers';
    if (ml >= CHENNAI_ML) return '≈ ' + (ml/CHENNAI_ML).toFixed(2) + '× Chennai crisis daily water';
    if (ml >= GLASS_ML)   return '≈ ' + (ml/GLASS_ML).toFixed(1)   + ' drinking glasses';
    if (ml >= CHAI_ML)    return '≈ ' + (ml/CHAI_ML).toFixed(1)    + ' cups of chai ☕';
    if (ml >= 5)          return '≈ ' + (ml/5).toFixed(1)          + ' teaspoons';
    return '≈ ' + ml.toFixed(1) + ' drops';
  }

  function getComparisons(ml) {
    return [
      { icon:'☕', val:(ml/CHAI_ML).toFixed(1),                         label:'cups of chai' },
      { icon:'🥛', val:(ml/GLASS_ML).toFixed(2),                        label:'drinking glasses' },
      { icon:'💧', val:(ml/CHENNAI_ML*100).toFixed(2)+'%',              label:'Chennai crisis daily' },
      { icon:'🚿', val:(ml/SHOWER_ML).toFixed(5),                       label:'showers' },
    ];
  }

  function getThirstLevel(ml) {
    if (ml >= THIRST_DANGER) return { level:'danger', color:'#D85A30', label:'🔴 Critical water use', msg:`Your session used ${fmtWater(ml)} — enough for ${(ml/CHENNAI_ML).toFixed(1)} days of crisis drinking water.` };
    if (ml >= THIRST_ALERT)  return { level:'alert',  color:'#BA7517', label:'🟠 High water use',     msg:`You've used over 1 litre this session — ${(ml/CHAI_ML).toFixed(0)} cups of chai worth.` };
    if (ml >= THIRST_WARN)   return { level:'warn',   color:'#EF9F27', label:'🟡 Thirst mode',        msg:`${fmtWater(ml)} used so far. Your AI session is accumulating real water cost.` };
    return null;
  }

  // ── State ──
  let sessionTotals  = { prompts:0, waterMl:0, energyWh:0, co2g:0 };
  let shownThresholds = new Set();
  let settings        = { showBadge:true, showTally:true, indiaMode:true, showThirst:true };
  let lastInputText   = '';
  let lastResponseCount = 0;  // track number of AI responses seen
  let processingPrompt  = false;

  chrome.storage.local.get(['sessionTotals','settings'], (res) => {
    if (res.sessionTotals) sessionTotals = res.sessionTotals;
    if (res.settings)      settings      = res.settings;
    lastResponseCount = countResponses();
    updateTally();
  });

  // ── Input capture ── (runs frequently, grabs whatever is in the box)
  function captureCurrentInput() {
    for (const sel of platform.inputSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const t = (el.innerText || el.value || '').trim();
        if (t.length > 2) { lastInputText = t; return t; }
      }
    }
    return '';
  }

  function countResponses() {
    for (const sel of platform.newMessageSelectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length > 0) return nodes.length;
    }
    return 0;
  }

  // ── Core: called when we're confident a prompt was submitted ──
  function onPromptSubmitted(text) {
    if (!text || text.length < 2) return;
    if (processingPrompt) return;
    processingPrompt = true;

    const cost = computeCost(text);

    sessionTotals.prompts++;
    sessionTotals.waterMl  = Math.round((sessionTotals.waterMl  + cost.indiaWaterMl) * 10) / 10;
    sessionTotals.energyWh = Math.round((sessionTotals.energyWh + cost.wh) * 1000) / 1000;
    sessionTotals.co2g     = Math.round((sessionTotals.co2g     + cost.co2g) * 100) / 100;

    chrome.storage.local.set({ sessionTotals });
    updateTally();
    checkThirstMode();

    if (settings.showBadge !== false) {
      waitForNewResponse(cost);
    }

    // Allow next prompt after a short cooldown
    setTimeout(() => { processingPrompt = false; }, 2000);
    lastInputText = '';
  }

  // ── Detection Strategy 1: Button click ──
  function tryBindButtons() {
    // Cast a wide net — any button that looks like a send button
    const candidates = document.querySelectorAll('button');
    candidates.forEach(btn => {
      if (btn._neeruBound) return;

      const label  = (btn.getAttribute('aria-label') || '').toLowerCase();
      const testid = (btn.getAttribute('data-testid') || '').toLowerCase();
      const title  = (btn.getAttribute('title') || '').toLowerCase();
      const svgUse = btn.querySelector('use')?.getAttribute('href') || '';

      const looksLikeSend =
        label.includes('send') ||
        testid.includes('send') ||
        title.includes('send') ||
        svgUse.includes('send') ||
        (btn.type === 'submit' && isNearInput(btn));

      if (looksLikeSend) {
        btn.addEventListener('mousedown', () => {
          captureCurrentInput();
        });
        btn.addEventListener('click', () => {
          const text = lastInputText;
          if (text.length > 2) {
            setTimeout(() => onPromptSubmitted(text), 100);
          }
        });
        btn._neeruBound = true;
      }
    });
  }

  function isNearInput(btn) {
    // Check if button is in the same form/container as an input
    let el = btn;
    for (let i = 0; i < 6; i++) {
      el = el.parentElement;
      if (!el) break;
      if (el.querySelector('textarea, div[contenteditable="true"]')) return true;
    }
    return false;
  }

  // ── Detection Strategy 2: Enter key ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      const active = document.activeElement;
      const isInput = active &&
        (active.contentEditable === 'true' ||
         active.tagName === 'TEXTAREA' ||
         active.tagName === 'INPUT');

      if (isInput) {
        const text = captureCurrentInput();
        if (text.length > 2) {
          setTimeout(() => onPromptSubmitted(text), 150);
        }
      }
    }
  }, true); // capture phase — fires before the site's own handlers

  // ── Detection Strategy 3: DOM mutation watching (most reliable fallback) ──
  // Watch for new AI response nodes appearing — that means a prompt was sent
  let mutationCooldown = false;

  const responseObserver = new MutationObserver(() => {
    if (mutationCooldown) return;

    const currentCount = countResponses();
    if (currentCount > lastResponseCount) {
      lastResponseCount = currentCount;

      // A new AI response appeared — a prompt must have been sent
      // Use the last captured input text
      if (lastInputText.length > 2 && !processingPrompt) {
        mutationCooldown = true;
        setTimeout(() => { mutationCooldown = false; }, 3000);

        const text = lastInputText;
        onPromptSubmitted(text);
      }
    }
  });

  // Watch the main content area for new response nodes
  const watchTarget = document.querySelector('main') ||
                      document.querySelector('#__next') ||
                      document.querySelector('[class*="chat"]') ||
                      document.body;

  responseObserver.observe(watchTarget, { childList: true, subtree: true });

  // ── Detection Strategy 4: Input box empty = sent ──
  // When the input box clears itself, the user just sent a message
  let inputWasPopulated = false;

  setInterval(() => {
    const text = captureCurrentInput();
    if (text.length > 5) {
      inputWasPopulated = true;
      lastInputText = text;
    } else if (inputWasPopulated && text.length === 0) {
      // Input just got cleared — prompt was submitted
      inputWasPopulated = false;
      if (lastInputText.length > 2 && !processingPrompt) {
        onPromptSubmitted(lastInputText);
      }
    }
  }, 300);

  // ── Re-bind buttons when DOM changes (SPA navigation) ──
  new MutationObserver(tryBindButtons).observe(document.body, { childList: true, subtree: true });
  tryBindButtons();

  // ── Wait for response then inject badge ──
  function waitForNewResponse(cost) {
    const startCount = countResponses();
    let attempts = 0;

    const iv = setInterval(() => {
      attempts++;
      const current = countResponses();

      if (current > startCount || attempts > 80) {
        clearInterval(iv);
        if (current > startCount) {
          setTimeout(() => injectBadge(cost), 1200);
        }
      }
    }, 500);
  }

  function injectBadge(cost) {
    let container = null;
    for (const sel of platform.responseSelectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length > 0) {
        container = nodes[nodes.length - 1].closest(
          '[class*="message"],[class*="turn"],[class*="chat"],[class*="group"],article,[class*="response"]'
        ) || nodes[nodes.length - 1].parentElement;
        break;
      }
    }
    if (!container) return;

    const existing = container.querySelector('[data-neeru]');
    if (existing) existing.remove();
    container.appendChild(createBadge(cost));
  }

  // ── Badge ──
  function createBadge(cost) {
    const badge = document.createElement('div');
    badge.className = 'neeru-badge';
    badge.setAttribute('data-neeru', 'true');

    const drops = Math.min(Math.round(cost.indiaWaterMl), 30);
    const dropHTML = Array.from({length:drops}, (_,i) =>
      `<span class="neeru-drop" style="animation-delay:${i*40}ms">💧</span>`
    ).join('');

    const comps = getComparisons(sessionTotals.waterMl);

    badge.innerHTML = `
      <div class="neeru-header">
        <span class="neeru-logo">neeru</span>
        <span class="neeru-platform">${platform.name} · India</span>
        <button class="neeru-close">✕</button>
      </div>
      <div class="neeru-metrics">
        <div class="neeru-metric neeru-water">
          <span class="neeru-metric-val">${fmtWater(cost.indiaWaterMl)}</span>
          <span class="neeru-metric-label">water</span>
        </div>
        <div class="neeru-metric neeru-energy">
          <span class="neeru-metric-val">${cost.wh < 1 ? (cost.wh*1000).toFixed(1)+' mWh' : cost.wh.toFixed(2)+' Wh'}</span>
          <span class="neeru-metric-label">energy</span>
        </div>
        <div class="neeru-metric neeru-co2">
          <span class="neeru-metric-val">${cost.co2g < 1 ? cost.co2g.toFixed(3) : cost.co2g.toFixed(2)}g</span>
          <span class="neeru-metric-label">CO₂</span>
        </div>
      </div>
      <div class="neeru-analogy">${getAnalogy(cost.indiaWaterMl)}</div>
      <div class="neeru-drops">${dropHTML}</div>
      <div class="neeru-comparisons">
        ${comps.slice(0,2).map(c =>
          `<span class="neeru-comp-pill">${c.icon} <strong>${c.val}</strong> ${c.label} (session)</span>`
        ).join('')}
      </div>
      <div class="neeru-session">
        Session: <strong>${fmtWater(sessionTotals.waterMl)}</strong> · <strong>${sessionTotals.prompts}</strong> prompts
        <button class="neeru-share-btn">↗ Share</button>
      </div>
    `;

    badge.querySelector('.neeru-close').addEventListener('click', () => {
      badge.style.opacity = '0';
      badge.style.transform = 'translateY(-8px)';
      setTimeout(() => badge.remove(), 250);
    });

    badge.querySelector('.neeru-share-btn').addEventListener('click', () => {
      openShareCard(sessionTotals.waterMl, sessionTotals.prompts, sessionTotals.co2g, sessionTotals.energyWh);
    });

    return badge;
  }

  // ── Thirst Mode ──
  function checkThirstMode() {
    if (settings.showThirst === false) return;
    const t = getThirstLevel(sessionTotals.waterMl);
    if (!t || shownThresholds.has(t.level)) return;
    shownThresholds.add(t.level);
    showThirstBanner(t);
  }

  function showThirstBanner(t) {
    const old = document.getElementById('neeru-thirst-banner');
    if (old) old.remove();
    const comps = getComparisons(sessionTotals.waterMl);
    const banner = document.createElement('div');
    banner.id = 'neeru-thirst-banner';
    banner.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#0a100e;border:1.5px solid ${t.color};border-radius:14px;padding:16px 20px;max-width:400px;width:90%;font-family:'Space Mono',monospace;color:#d0ebe3;box-shadow:0 8px 40px rgba(0,0,0,0.6);`;
    banner.innerHTML = `
      <style>@keyframes nb{from{opacity:0;transform:translateX(-50%) translateY(-14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}#neeru-thirst-banner{animation:nb .4s cubic-bezier(.34,1.4,.64,1) forwards}#neeru-thirst-banner .cg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}#neeru-thirst-banner .ci{background:rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;font-size:11px;color:#7aa898}#neeru-thirst-banner .cv{font-size:14px;font-weight:700;color:#5DCAA5;display:block;margin-bottom:1px}</style>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:13px;font-weight:700;color:${t.color};">${t.label}</span>
        <button onclick="document.getElementById('neeru-thirst-banner').remove()" style="background:none;border:none;color:#4a8070;cursor:pointer;font-size:14px;">✕</button>
      </div>
      <div style="font-size:12px;color:#7aa898;line-height:1.6;">${t.msg}</div>
      <div class="cg">${comps.map(c=>`<div class="ci"><span class="cv">${c.icon} ${c.val}</span>${c.label}</div>`).join('')}</div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button onclick="document.getElementById('neeru-thirst-banner').remove()" style="flex:1;padding:8px;background:transparent;border:1px solid #1a3530;border-radius:8px;color:#4a8070;font-family:'Space Mono',monospace;font-size:10px;cursor:pointer;text-transform:uppercase;">Dismiss</button>
        <button onclick="window.open('https://jalshakti-dowr.gov.in','_blank');document.getElementById('neeru-thirst-banner').remove()" style="flex:1;padding:8px;background:#0F6E56;border:none;border-radius:8px;color:#c8f0e0;font-family:'Space Mono',monospace;font-size:10px;cursor:pointer;text-transform:uppercase;">India water crisis →</button>
      </div>
    `;
    document.body.appendChild(banner);
    setTimeout(() => { if (banner.parentNode) banner.remove(); }, 14000);
  }

  // ── Share Card ──
  function openShareCard(waterMl, prompts, co2g, energyWh) {
    const old = document.getElementById('neeru-share-overlay');
    if (old) old.remove();
    const comps = getComparisons(waterMl);
    const date  = new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
    const fmtW  = fmtWater(waterMl);
    const fmtE  = energyWh >= 1 ? energyWh.toFixed(2)+' Wh' : (energyWh*1000).toFixed(1)+' mWh';
    const fmtC  = co2g < 1 ? co2g.toFixed(3)+'g' : co2g.toFixed(2)+'g';
    const overlay = document.createElement('div');
    overlay.id = 'neeru-share-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;font-family:"Space Mono",monospace;';
    overlay.innerHTML = `
      <style>#nsc{background:linear-gradient(145deg,#0a1a14,#0d2018 60%,#091510);border:1px solid #1D9E75;border-radius:20px;padding:26px;width:360px;max-width:92vw;color:#d0ebe3;}#nsc .logo{font-size:14px;font-weight:700;color:#5DCAA5;letter-spacing:.1em;margin-bottom:2px;}#nsc .tag{font-size:10px;color:#3a6a58;margin-bottom:18px;}#nsc .big{font-size:42px;font-weight:700;color:#5DCAA5;line-height:1;margin-bottom:2px;}#nsc .biglbl{font-size:10px;color:#4a8070;text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px;}#nsc .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;}#nsc .cell{background:rgba(29,158,117,.08);border:1px solid rgba(29,158,117,.2);border-radius:10px;padding:10px 12px;}#nsc .cv{font-size:16px;font-weight:700;color:#9DDFC8;display:block;margin-bottom:2px;}#nsc .cl{font-size:10px;color:#3a6a58;}#nsc hr{border:none;border-top:1px solid #1a3530;margin:12px 0;}#nsc .chips{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;}#nsc .chip{background:rgba(255,255,255,.05);border-radius:20px;padding:5px 10px;font-size:10px;color:#7aa898;}#nsc .chip strong{color:#5DCAA5;}#nsc .ind{font-size:10px;color:#3a5a90;background:rgba(127,119,221,.08);border:1px solid rgba(127,119,221,.2);border-radius:8px;padding:8px 10px;margin-bottom:14px;line-height:1.5;}#nsc .foot{display:flex;justify-content:space-between;font-size:10px;color:#2a4a3e;}#nsc .btns{display:flex;gap:8px;margin-top:14px;}#nsc button{flex:1;padding:9px;border-radius:8px;font-family:"Space Mono",monospace;font-size:10px;cursor:pointer;text-transform:uppercase;letter-spacing:.05em;transition:opacity .15s;}#nsc .bcopy{background:#0F6E56;border:none;color:#c8f0e0;}#nsc .bclose{background:transparent;border:1px solid #1a3530;color:#4a8070;}</style>
      <div id="nsc">
        <div class="logo">💧 neeru</div>
        <div class="tag">नीरू · AI Water Footprint · ${date}</div>
        <div class="big">${fmtW}</div>
        <div class="biglbl">water used this session · India-adjusted</div>
        <div class="grid">
          <div class="cell"><span class="cv">${prompts}</span><span class="cl">prompts sent</span></div>
          <div class="cell"><span class="cv">${fmtE}</span><span class="cl">energy used</span></div>
          <div class="cell"><span class="cv">${fmtC}</span><span class="cl">CO₂ equivalent</span></div>
          <div class="cell"><span class="cv">${prompts > 0 ? (waterMl/prompts).toFixed(1)+' ml' : '—'}</span><span class="cl">avg per prompt</span></div>
        </div>
        <hr>
        <div class="chips">${comps.map(c=>`<div class="chip">${c.icon} <strong>${c.val}</strong> ${c.label}</div>`).join('')}</div>
        <div class="ind">🇮🇳 India data centers use 22% more water. CO₂ uses India grid: 0.71 kg/kWh — nearly 2× the US average.</div>
        <div class="foot"><span>neeru · making AI's cost visible</span><span>${platform.name}</span></div>
        <div class="btns">
          <button class="bcopy" id="ncopy">📋 Copy as text</button>
          <button class="bclose" id="nclose">Close</button>
        </div>
      </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#nclose').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#ncopy').addEventListener('click', () => {
      const txt = `💧 My AI Water Footprint — ${date}\n━━━━━━━━━━━━━━━━━━━━\nWater: ${fmtW} (India +22%)\nPrompts: ${prompts} | Energy: ${fmtE} | CO₂: ${fmtC}\n━━━━━━━━━━━━━━━━━━━━\n${comps.map(c=>`${c.icon} ${c.val} ${c.label}`).join('\n')}\n━━━━━━━━━━━━━━━━━━━━\nTracked by Neeru — making AI's hidden cost visible 🌊`;
      navigator.clipboard.writeText(txt).then(() => {
        const btn = overlay.querySelector('#ncopy');
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.textContent = '📋 Copy as text'; }, 2000);
      });
    });
    document.body.appendChild(overlay);
  }

  // ── Tally Pill ──
  function getOrCreateTally() {
    let t = document.getElementById('neeru-tally');
    if (!t) {
      t = document.createElement('div');
      t.id = 'neeru-tally';
      t.innerHTML = `<span id="neeru-tally-icon">💧</span><span id="neeru-tally-text">0 ml</span>`;
      t.title = 'Neeru: click for share card';
      t.addEventListener('click', () => openShareCard(sessionTotals.waterMl, sessionTotals.prompts, sessionTotals.co2g, sessionTotals.energyWh));
      document.body.appendChild(t);
    }
    return t;
  }

  function updateTally() {
    if (settings.showTally === false) {
      const t = document.getElementById('neeru-tally');
      if (t) t.style.display = 'none';
      return;
    }
    const tally = getOrCreateTally();
    tally.style.display = 'flex';
    const txt = document.getElementById('neeru-tally-text');
    if (txt) txt.textContent = fmtWater(sessionTotals.waterMl);
    const th = getThirstLevel(sessionTotals.waterMl);
    if (th) tally.style.borderColor = th.color;
  }

})();
