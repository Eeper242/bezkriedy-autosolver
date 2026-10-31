// popup.js
const solveButton = document.getElementById('solveButton');

solveButton.addEventListener('click', async () => {
  // Toggle the CSS class (Red <-> Blue)
  solveButton.classList.toggle('active');
  solveButton.classList.toggle('nactive');
  
  // Check the current state and update button text / send message
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle_solve" }).catch(err => {
      console.log("Could not reach content script. Are you on the right page?", err);
    });
  }

  // Optional: Change button text dynamically depending on state
  if (solveButton.classList.contains('active')) {
    solveButton.textContent = "Zastaviť";   //Changes text back to "Solve"
    solveButton.style.backgroundColor = "#ff4d4d"; //Changes background color to red
  } else {
    solveButton.textContent = "Riešiť";   // Changes text back to "Solve"
    solveButton.style.backgroundColor = "#4CAF50"; // Changes background color to green
  }
});

document.onfocus = function() {
  if (solveButton.classList.contains('active')) {
    solveButton.textContent = "Riešiť";   // Changes text back to "Solve"
    solveButton.style.backgroundColor = "#4CAF50"; // Changes background color to green
  } else {
    solveButton.textContent = "Zastaviť";   //Changes text back to "Solve"
    solveButton.style.backgroundColor = "#ff4d4d"; //Changes background color to red
  }
}