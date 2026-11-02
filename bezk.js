// bezk.js
// Main content script
console.log("Initializing Eeper242's bezkriedyAutosolver extension (bezk.js)...");

// Inject a script into the page to override the wait, playYes, and playNo functions, to make anser quicker to load and avoid unnecessary delays
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
        function getIntervalMs(key) { return settings.interval[key] || settings.interval.normal; }

        // Load initial interval from storage or default to 'normal'
        let currentIntervalKey = await new Promise(resolve => {
            chrome.storage.local.get(['currentInterval'], data => { resolve(data.currentInterval || settings.interval.current); });
        });

        // The heart of the solver (click the answer button if it exists)
        function solveBezkriedy() {
            let ansbtn = document.querySelector('[id*="ans-"][id*="_4"]'); // 1. FInd the naswert button that starts with ans- and ends with _4
            if (ansbtn) { // 2. If found, click it
                ansbtn.click();
                console.log("(arsp) Answer button was found and clicked successfully.");
            } else { console.log("Answer button not found, skipping"); } // 3. If not found, log and wait for the next interval
        }

        // Switch between solving and not solving, while ensuring function executes at certain interval which is selected by user in popup (default is 500ms, found in settings.json)
        function toggleSolve() {
            solve = !solve;
            console.log("(arsp) Toggled solve state to: " + solve);
            if (solve) {
                let ms = getIntervalMs(currentIntervalKey);
                intervalId = setInterval(solveBezkriedy, ms);
            } else {
                clearInterval(intervalId);
                console.log("Solving stopped.");
            }
        }

        // listening for messages from popup.js, based on message executes the appropriate function
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            // Request to switch solving state
            if (request.action === "toggle_solve") {
                toggleSolve();
                sendResponse({ isSolving: solve }); // Response back to popup.js with the current state of solving
            }
            // Request to change the interval from popup.js
            if (request.action === "interval_change" && request.interval) {
                currentIntervalKey = request.interval; // Update the current interval key
                console.log("(arsp) Changed current interval to: " + currentIntervalKey);

                // Changes speed mid solving
                if (solve) {
                    clearInterval(intervalId);
                    let ms = getIntervalMs(currentIntervalKey);
                    intervalId = setInterval(solveBezkriedy, ms);
                }
                sendResponse({ status: "updated" }); // Response back to popup.js with the current state of solving
            }
            return true; // Keep message channel open for async response if needed
        });

        console.log("Eeper242's bezkriedyAutosolver extension (bezk.js) initialized successfully.");

    } catch (error) { console.error("(arsp) Failed to load settings.json:", error); }
}
initBezk();