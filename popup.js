async function initBezk() {
    try {
        let response = await fetch(chrome.runtime.getURL('settings.json'));
        let settings = await response.json();

        const solveButton = document.getElementById('solveButton');
        const intervalSelect = document.getElementById('intervalSelect');

        // 1. Load the saved interval from storage when popup opens and set the dropdown
        chrome.storage.local.get(['currentInterval'], (data) => {
            const savedInterval = data.currentInterval || settings.interval.current;
            intervalSelect.value = savedInterval;
        });

        // 2. Also check if the content script is currently solving, so the button matches state
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            chrome.tabs.sendMessage(tab.id, { action: "get_status" }, (response) => {
                if (!chrome.runtime.lastError && response) {
                    updateButtonUI(response.isSolving);
                }
            });
        }

        solveButton.addEventListener('click', async () => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          
          if (tab) {
            chrome.tabs.sendMessage(tab.id, { action: "toggle_solve" }, (response) => {
              if (chrome.runtime.lastError) {
                console.log("Could not reach content script. Are you on the right page?");
                return;
              }
              updateButtonUI(response && response.isSolving);
            });
          }
        });

        function updateButtonUI(isSolving) {
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

        intervalSelect.addEventListener('change', async () => {
          const selectedInterval = intervalSelect.value;
          
          chrome.storage.local.set({ currentInterval: selectedInterval }, async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
              chrome.tabs.sendMessage(tab.id, { 
                action: "interval_change", 
                interval: selectedInterval 
              }).catch(err => {
                console.log("Could not reach content script.", err);
              });
            }
          });
        });
      } catch (error) {
        console.error("Error initializing bezkriedyAutosolver extension:", error);
      }
}
initBezk();