// Neeru — Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    sessionTotals: { prompts: 0, waterMl: 0, energyWh: 0, co2g: 0 },
    lifetimeTotals: { prompts: 0, waterMl: 0, energyWh: 0, co2g: 0 },
    settings: {
      showBadge: true,
      showTally: true,
      indiaMode: true,
    }
  });
});

// Reset session totals once per day
chrome.alarms.create('resetSession', { periodInMinutes: 60 * 24 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetSession') {
    chrome.storage.local.get(['sessionTotals', 'lifetimeTotals'], (res) => {
      const s = res.sessionTotals || {};
      const l = res.lifetimeTotals || {};
      // Roll session into lifetime
      chrome.storage.local.set({
        lifetimeTotals: {
          prompts: (l.prompts || 0) + (s.prompts || 0),
          waterMl: (l.waterMl || 0) + (s.waterMl || 0),
          energyWh: (l.energyWh || 0) + (s.energyWh || 0),
          co2g: (l.co2g || 0) + (s.co2g || 0),
        },
        sessionTotals: { prompts: 0, waterMl: 0, energyWh: 0, co2g: 0 },
      });
    });
  }
});
