// popup.js
const RENDER_BACKEND_URL = "https://neural-sieve-backend.onrender.com";

document.getElementById("analyze-btn").addEventListener("click", async () => {
  const outputDiv = document.getElementById("output");
  const actionBtn = document.getElementById("analyze-btn");
  
  // Update UI to show we are starting the process
  outputDiv.className = "status-wait";
  outputDiv.innerText = "⏳ Reading tab document DOM tokens...";
  actionBtn.disabled = true;

  try {
    // 1. Ask Chrome for the current active open browser tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error("Could not capture an active browser tab context.");

    // 2. Inject a lightweight script to grab the loaded webpage text
    const [{ result: pageText }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText
    });

    // Validate that we actually grabbed text context
    if (!pageText || pageText.trim().length < 20) {
      throw new Error("Target page document context contains insufficient text metrics to analyze.");
    }

    outputDiv.innerText = "🧠 Forwarding context payload data matrix to Render...";

    // Clean any trailing slashes from the URL string safely in JavaScript
    const cleanBackendUrl = RENDER_BACKEND_URL.replace(/\/$/, "");

    // 3. POST the scraped text and the tab's URL directly to your live Render API
    const response = await fetch(`${cleanBackendUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: tab.url,
        text: pageText.substring(0, 4000) // Keep payload sizes reasonable for the 512MB free cloud tier
      })
    });

    if (!response.ok) {
      throw new Error(`Render core engine reported error status code: ${response.status}`);
    }

    const verificationMetrics = await response.json();

    // 4. Print the structured verdict back to the user interface panel
    outputDiv.className = "status-success";
    outputDiv.innerText = `🔍 SCAN ANALYSIS SUMMARY\n\n` + 
                          `Verdict: ${verificationMetrics.overall_verdict || "Evaluated"}\n\n` +
                          `Details: ${verificationMetrics.overall_explanation || "Verification analysis stream closed successfully."}`;
  } catch (error) {
    // Catch any connection failures or script errors cleanly
    outputDiv.className = "status-error";
    outputDiv.innerText = `❌ System Analytics Fault: ${error.message}`;
  } finally {
    // Re-enable the button so the user can run another scan if they want to
    actionBtn.disabled = false;
  }
});