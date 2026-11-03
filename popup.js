// popup.js
// Popup handling script
console.log("(arsp) Initializing popup.js...");

async function initBezk() {
  try {
    let jsonFile = await fetch(chrome.runtime.getURL('settings.json'));
    let settings = await jsonFile.json();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const solveButton = document.getElementById('solveButton');
    const intervalSelect = document.getElementById('intervalSelect');
    const badPageLabel = document.getElementById('badPage');

    // Update button UI based on solving state (yes=stop / no=start)
    function updateButtonUI(isSolving) {
      if (isSolving) {
        solveButton.textContent = settings.buttonUI.solving.text;
        solveButton.style.backgroundColor = settings.buttonUI.solving.color;
      } else {
        solveButton.textContent = settings.buttonUI.notSolving.text;
        solveButton.style.backgroundColor = settings.buttonUI.notSolving.color;
      }
    }

    // Disable controls if not on bezkriedy.sk/papagaj.php*
    if (tab && tab.url.includes("bezkriedy.sk/papagaj.php*")) { solveButton.disabled = false; badPageLabel.disabled = true; }
    else { solveButton.disabled = true; badPageLabel.disabled = false; }

    // Load saved interval (chrome.storage.local)
    chrome.storage.local.get(['currentInterval'], (data) => {
        const savedInterval = data.currentInterval || settings.interval.current;
        intervalSelect.value = savedInterval;
    });

    // Check for Switch response and update UI (from bezk.js)
    if (tab) {
        chrome.tabs.sendMessage(tab.id, { action: "get_status" }, (response) => {
            if (!chrome.runtime.lastError && response) { updateButtonUI(response.isSolving); }
        });
    }

    // #solveButton listener, sends message to Switch
    solveButton.addEventListener('click', async () => {
      if (tab){
        chrome.tabs.sendMessage(tab.id, { action: "toggle_solve" }, (response) => {
          if (!chrome.runtime.lastError) { updateButtonUI(response && response.isSolving); }
          else { console.log("(arsp) Could not reach content script."); }
        });
      }
    });

    // #intervalSelect listener, sends message for currentInterval update
    intervalSelect.addEventListener('change', async () => {
      const selectedInterval = intervalSelect.value;
      chrome.storage.local.set({ currentInterval: selectedInterval }, async () => {
        if (tab) { chrome.tabs.sendMessage(tab.id, { action: "interval_change", interval: selectedInterval }) }
        else { console.log("(arsp) Could not reach content script."); }
      });
    });

  } catch (error) { console.error("(arsp) Error initializing popup.js: ", error); }
}
initBezk();