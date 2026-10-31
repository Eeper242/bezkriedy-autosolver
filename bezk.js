// bezk.js
console.log("Initializing bezkriedyAutosolver extension...");

var interval = 250; // Interval in milliseconds (0.5 seconds by default)
// Helper variables
let solve = false;
let intervalId = null;

// The heart of this extension
function solveBezkriedy() {
    //If answer button exists/is found, click it. If not, wait for the next interval.
    ansbtn = document.querySelector('[id*="ans-"][id*="_4"]');
    if (ansbtn) {
        ansbtn.click();
        console.log("Answer button was found and clicked sucessfully.")
    }
    else {
        console.log("Answer button not found, waiting...");
    }
}

// Just some function to toggle the solving state on and off
function toggleSolve(){
    solve = !solve;
    console.log("Toggled solve state to: " + solve);
    if (solve) {
        intervalId = setInterval(solveBezkriedy, interval);
    } else {
        clearInterval(intervalId);
        console.log("Solving stopped.");
    }
}

// RECIEVING MESSAGES FROM POPUP
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle_solve") {
        toggleSolve();
    }
});
console.log("bezkriedyAutosolver extension initialized successfully.");