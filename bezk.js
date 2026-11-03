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
        // Tell chrome to fetch settings.json and assign it to let settings
        let jsonFile = await fetch(chrome.runtime.getURL('settings.json'));
        let settings = await jsonFile.json();
        let solve = false;
        let intervalInUse = null;
        // Assign currentInterval to saved value in chrome.storage.local || settings.interval.current
        let currentInterval = await new Promise(resolve => {
            chrome.storage.local.get(['currentInterval'], data => { resolve(data.currentInterval || settings.interval.current); });
        });

        function getCurrentInterval(key) { return settings.interval[key] || settings.interval.normal; }

        // (Engine) Find answer button with id ans-*_4. If exist, click it, else skip
        function solveBezkriedy() {
            let ansbtn = document.querySelector('[id*="ans-"][id*="_4"]');
            if (ansbtn) { ansbtn.click(); }
            else { console.log("(arsp) Answer button not found, skipping"); }
        }

        // (Switch) Turns on/off solver, based on if switch message was recieved (from popup.js)
        function toggleSolve() {
            solve = !solve;
            console.log("(arsp) Solving: " + solve);
            if (solve) { intervalInUse = setInterval(solveBezkriedy, getCurrentInterval(currentInterval)); }
            else { clearInterval(intervalInUse); console.log("(arsp) Solving stopped."); }
        }

        // Message listener, messages from popup.js
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            // Switch solving engine, respond back with current state
            if (request.action === "toggle_solve") {
                toggleSolve();
                sendResponse({ isSolving: solve });
            }
            // Change interval in use, respond back with status updated
            if (request.action === "interval_change" && request.interval) {
                currentInterval = request.interval;
                console.log("(arsp) New interval: " + currentInterval);
                if (solve) { clearInterval(intervalInUse); intervalInUse = setInterval(solveBezkriedy, getCurrentInterval(currentInterval)); } // Changes speed mid solving
                sendResponse({ status: "updated" });
            }
            return true; // Keep message channel open for async response if needed
        });
        console.log("Eeper242's bezkriedyAutosolver extension (bezk.js) initialized successfully.");

    } catch (error) { console.error("(arsp) Failed to load settings.json:", error); }
}
initBezk();