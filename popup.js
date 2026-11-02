// popup.js
// Popup handling script

console.log("(arsp) Initializing popup.js...");
async function initBezk() {
  try {
    let response = await fetch(chrome.runtime.getURL('settings.json'));
    let settings = await response.json();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // Get html elements
    const solveButton = document.getElementById('solveButton');
    const intervalSelect = document.getElementById('intervalSelect');
    const badPageLabel = document.getElementById('badPage');

    // If im not on bezkredy.sk, show label
    if (tab && !tab.url.includes("bezkriedy.sk")) { solveButton.disabled = false; }
    else { solveButton.disabled = true; }

    // Load saved interval (chrome.storage.local)
    chrome.storage.local.get(['currentInterval'], (data) => {
        const savedInterval = data.currentInterval || settings.interval.current;
        intervalSelect.value = savedInterval;
    });

    // Get solving state (from bezk.js)
    if (tab) {
        chrome.tabs.sendMessage(tab.id, { action: "get_status" }, (response) => {
            if (!chrome.runtime.lastError && response) { updateButtonUI(response.isSolving); }
        });
    }

    // Add event listener to the #solveButton, sends message to toggle solving state
    solveButton.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab){
        chrome.tabs.sendMessage(tab.id, { action: "toggle_solve" }, (response) => {
          if (chrome.runtime.lastError) { console.log("(arsp) Could not reach content script."); return; }
          updateButtonUI(response && response.isSolving);
        });
      }
    });

    // Updates button UI based on the solving state (isSolving)
    function updateButtonUI(isSolving) {
      // If yes show stop, else show run
      if (isSolving) {
        solveButton.textContent = "Zastaviť";
        solveButton.style.backgroundColor = "#ff4d4d"; // Red
        solveButton.classList.add('active');
      } else {
        solveButton.textContent = "Riešiť";
        solveButton.style.backgroundColor = "#4CAF50"; // Green
        solveButton.classList.remove('active');
      }
    }

    // Add event listener to the #intervalSelect, sends message to change interval
    intervalSelect.addEventListener('change', async () => {
      const selectedInterval = intervalSelect.value;
      chrome.storage.local.set({ currentInterval: selectedInterval }, async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) { chrome.tabs.sendMessage(tab.id, { action: "interval_change", interval: selectedInterval }).catch(err => { console.log("Could not reach content script.", err); }); }
      });
    });

  } catch (error) { console.error("(arsp) Error initializing popup.js: ", error); }
}
initBezk();