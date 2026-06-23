// popup.js
const RENDER_BACKEND_URL = "https://neural-sieve-backend.onrender.com";

// Verdict colour token map → matches CSS classes
const VERDICT_STYLES = {
  trust:    { cls: 'v-trust',  accent: '#00C896', border: 'rgba(0,200,150,0.2)',  bg: 'rgba(0,200,150,0.06)',  badgeBorder: 'rgba(0,200,150,0.25)' },
  risk:     { cls: 'v-risk',   accent: '#FF5D73', border: 'rgba(255,93,115,0.2)', bg: 'rgba(255,93,115,0.06)', badgeBorder: 'rgba(255,93,115,0.25)' },
  unveri:   { cls: 'v-unveri', accent: '#F59E0B', border: 'rgba(245,158,11,0.2)', bg: 'rgba(245,158,11,0.06)',  badgeBorder: 'rgba(245,158,11,0.25)' },
};

function resolveVerdictStyle(raw = '') {
  const v = raw.toLowerCase();
  if (v.includes('trust') || v.includes('verified') || v.includes('true') || v.includes('supported')) {
    return VERDICT_STYLES.trust;
  }
  if (v.includes('risk') || v.includes('fake') || v.includes('false') || v.includes('refuted') || v.includes('high')) {
    return VERDICT_STYLES.risk;
  }
  return VERDICT_STYLES.unveri;
}

document.getElementById("analyze-btn").addEventListener("click", async () => {
  const outputDiv      = document.getElementById("output");
  const actionBtn      = document.getElementById("analyze-btn");
  const claimsHeading  = document.getElementById("claims-heading");
  const claimsContainer = document.getElementById("claims-container");
  const claimsCount    = document.getElementById("claims-count");

  // ── Reset UI ──
  claimsContainer.innerHTML = "";
  claimsHeading.classList.remove("visible");
  outputDiv.className = "status-wait";
  outputDiv.innerHTML = `<span style="display:flex;align-items:center;gap:8px"><span class="spinner"></span> Reading tab document DOM…</span>`;
  actionBtn.disabled = true;

  try {
    // 1. Grab the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error("Could not capture the active browser tab.");

    // 2. Inject script to pull page text
    const [{ result: pageText }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText,
    });

    if (!pageText || pageText.trim().length < 20) {
      throw new Error("Page contains insufficient text to analyze.");
    }

    outputDiv.innerHTML = `<span style="display:flex;align-items:center;gap:8px"><span class="spinner"></span> Forwarding payload to RAG engine…</span>`;

    // 3. Send to backend
    const cleanUrl  = RENDER_BACKEND_URL.replace(/\/$/, "");
    const response  = await fetch(`${cleanUrl}/analyze`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url:  tab.url,
        text: pageText.substring(0, 4000),
      }),
    });

    if (!response.ok) throw new Error(`Backend returned status ${response.status}`);

    const data = await response.json();

    // 4. Render Overall Verdict block
    const overallVerdict = data.overall_verdict || "UNVERIFIED";
    const vs = resolveVerdictStyle(overallVerdict);

    outputDiv.className = "";
    outputDiv.innerHTML = `
      <div class="verdict-block ${vs.cls}" style="
        border-color: ${vs.border};
        background:   ${vs.bg};
        color:        ${vs.accent};
      ">
        <div style="position:absolute;top:0;left:0;width:3px;height:100%;background:${vs.accent};border-radius:2px 0 0 2px"></div>
        <span class="v-eyebrow">Overall verdict</span>
        <div class="v-title">${overallVerdict}</div>
        <div class="v-text" style="color:${vs.accent}">
          ${data.overall_explanation || "No explanation available."}
        </div>
      </div>
    `;

    // 5. Render claim cards
    const claims = data.claims;
    if (Array.isArray(claims) && claims.length > 0) {
      claimsCount.textContent = `${claims.length} claim${claims.length !== 1 ? 's' : ''}`;
      claimsHeading.classList.add("visible");

      claims.forEach((claim) => {
        const rawVerdict = claim.verdict || "UNVERIFIED";
        const cs = resolveVerdictStyle(rawVerdict);

        // Build sources HTML
        const proofLinks = claim.links || claim.sources || [];
        let linksHTML = "";
        if (proofLinks.length > 0) {
          const anchors = proofLinks.map((item, i) => {
            const href  = typeof item === "object" ? item.url   : item;
            const label = typeof item === "object" && item.title ? item.title : `Source ${i + 1}`;
            if (!href) return "";
            return `<a href="${href}" target="_blank" class="proof-link">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              ${label}
            </a>`;
          }).join("");
          linksHTML = `
            <div class="links-section">
              <span class="links-label">Sources</span>
              <div class="links-row">${anchors}</div>
            </div>`;
        }

        const claimText = claim.claim || claim.claim_text || "No claim text.";
        const claimExpl = claim.explanation || claim.reason || "No details provided.";

        const card = document.createElement("div");
        card.className = "claim-card";
        card.style.borderColor  = cs.badgeBorder;
        card.style.background   = cs.bg;

        card.innerHTML = `
          <div class="card-bar" style="background:${cs.accent}"></div>
          <div class="claim-card-top">
            <div class="claim-text">${claimText}</div>
            <span class="claim-badge" style="color:${cs.accent};border-color:${cs.badgeBorder}">${rawVerdict}</span>
          </div>
          <div class="claim-divider"></div>
          <span class="claim-section-label">Verification report</span>
          <div class="claim-reason">${claimExpl}</div>
          ${linksHTML}
        `;

        claimsContainer.appendChild(card);
      });
    }

  } catch (err) {
    outputDiv.className = "";
    outputDiv.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:rgba(255,93,115,0.07);border:1px solid rgba(255,93,115,0.2);border-radius:10px;font-size:12px;color:#FF5D73;font-family:var(--ffm)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        ${err.message}
      </div>`;
  } finally {
    actionBtn.disabled = false;
  }
});

// Add to the bottom of popup.js (Replace placeholder link with your actual Vercel URL)
document.getElementById("dashboard-btn").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://fake-news-detector-tawny.vercel.app" });
});