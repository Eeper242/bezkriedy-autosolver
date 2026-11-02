// bezk.js
console.log("Initializing bezkriedyAutosolver extension...");

let script = document.createElement('script');
script.textContent = `
    window.wait = function(ms) { return Promise.resolve(); };
    window.playYes = function() { return Promise.resolve(); };
    window.playNo = function() { return Promise.resolve(); };
`;
(document.head || document.documentElement).appendChild(script);
script.remove(); // Clean up the tag immediately after execution

async function initBezk() {
    try {
        let response = await fetch(chrome.runtime.getURL('settings.json'));
        let settings = await response.json();

        let solve = false;
        let intervalId = null;

        // Helper function to resolve interval key to actual milliseconds
        function getIntervalMs(key) {
            return settings.interval[key] || settings.interval.normal;
        }

        // Load initial interval from storage or default to 'normal'
        let currentIntervalKey = await new Promise(resolve => {
            chrome.storage.local.get(['currentInterval'], data => {
                resolve(data.currentInterval || settings.interval.current);
            });
        });

        function solveBezkriedy() {
            let ansbtn = document.querySelector('[id*="ans-"][id*="_4"]');
            if (ansbtn) {
                ansbtn.click();
                console.log("Answer button was found and clicked successfully.");
            } else {
                console.log("Answer button not found, waiting...");
            }
        }

        function toggleSolve() {
            solve = !solve;
            console.log("Toggled solve state to: " + solve);
            if (solve) {
                let ms = getIntervalMs(currentIntervalKey);
                intervalId = setInterval(solveBezkriedy, ms);
            } else {
                clearInterval(intervalId);
                console.log("Solving stopped.");
            }
        }

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "toggle_solve") {
                toggleSolve();
                // Send the current active state back to the popup!
                sendResponse({ isSolving: solve });
            }
            if (request.action === "interval_change" && request.interval) {
                currentIntervalKey = request.interval;
                console.log("Changed current interval to: " + currentIntervalKey);

                if (solve) {
                    clearInterval(intervalId);
                    let ms = getIntervalMs(currentIntervalKey);
                    intervalId = setInterval(solveBezkriedy, ms);
                }
                sendResponse({ status: "updated" });
            }
            return true; // Keep message channel open for async response if needed
        });

        console.log("bezkriedyAutosolver extension initialized successfully.");

    } catch (error) {
        console.error("Failed to load settings.json:", error);
    }
}

initBezk();