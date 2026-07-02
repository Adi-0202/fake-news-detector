// popup.js
const RENDER_BACKEND_URL = "https://neural-sieve-backend.onrender.com";

// Verdict colour token map → matches CSS classes
const VERDICT_STYLES = {
  trust:    { cls: 'v-trust',  accent: '#00C896', border: 'rgba(0,200,150,0.2)',  bg: 'rgba(0,200,150,0.06)',  badgeBorder: 'rgba(0,200,150,0.25)' },
  risk:     { cls: 'v-risk',   accent: '#FF5D73', border: 'rgba(255,93,115,0.2)', bg: 'rgba(255,93,115,0.06)', badgeBorder: 'rgba(255,93,115,0.25)' },
  unveri:   { cls: 'v-unveri', accent: '#F59E0B', border: 'rgba(245,158,11,0.2)', bg: 'rgba(245,158,11,0.06)',  badgeBorder: 'rgba(245,158,11,0.25)' },
};

let isLoginMode = true;

function resolveVerdictStyle(raw = '') {
  const v = raw.toLowerCase().trim();
  
  // ── RECTIFIED: Checking unverified first prevents sub-string matching collisions ──
  if (v.includes('unverified') || v.includes('unknown') || v.includes('uncertain')) {
    return VERDICT_STYLES.unveri; // Yellow
  }
  if (v.includes('trust') || v.includes('verified') || v.includes('true') || v.includes('supported')) {
    return VERDICT_STYLES.trust; // Green
  }
  if (v.includes('risk') || v.includes('fake') || v.includes('false') || v.includes('refuted') || v.includes('high')) {
    return VERDICT_STYLES.risk; // Red
  }
  return VERDICT_STYLES.unveri; // Fallback Yellow
}

document.addEventListener("DOMContentLoaded", () => {
  // ── UI ELEMENTS SELECTION ──
  const authScreen         = document.getElementById("auth-screen");
  const mainScreen         = document.getElementById("main-screen");
  const authForm           = document.getElementById("auth-form");
  const emailInput         = document.getElementById("auth-email");
  const passwordInput      = document.getElementById("auth-password");
  const passwordToggleBtn  = document.getElementById("password-toggle-btn");
  const eyeIcon            = document.getElementById("eye-icon");
  const eyeOffIcon         = document.getElementById("eye-off-icon");
  const emailWarn          = document.getElementById("email-warn");
  const passwordWarn       = document.getElementById("password-warn");
  const authAlertContainer = document.getElementById("auth-alert-container");
  const authSubmitBtn      = document.getElementById("auth-submit-btn");
  const authSwitchBtn      = document.getElementById("auth-switch-btn");
  const authTitle          = document.getElementById("auth-title");
  const authSubtitle       = document.getElementById("auth-subtitle");
  
  const logoutBtn          = document.getElementById("logout-btn");
  const analyzeBtn         = document.getElementById("analyze-btn");
  const dashboardBtn       = document.getElementById("dashboard-btn");
  const outputDiv          = document.getElementById("output");
  const claimsHeading      = document.getElementById("claims-heading");
  const claimsContainer    = document.getElementById("claims-container");
  const claimsCount        = document.getElementById("claims-count");

  // ── 1. INITIAL SESSION CHECK ──
  chrome.storage.local.get(["token"], (res) => {
    if (res.token) {
      authScreen.classList.add("hidden");
      mainScreen.classList.remove("hidden");
    } else {
      authScreen.classList.remove("hidden");
      mainScreen.classList.add("hidden");
    }
  });

  // ── 2. INPUT CLEAR WARNING TRIGGERS ──
  emailInput.addEventListener("input", () => {
    emailInput.classList.remove("input-error");
    emailWarn.classList.add("hidden");
    authAlertContainer.classList.add("hidden");
  });

  passwordInput.addEventListener("input", () => {
    passwordInput.classList.remove("input-error");
    passwordWarn.classList.add("hidden");
    authAlertContainer.classList.add("hidden");
  });

  // ── 3. PASSWORD VISIBILITY TOGGLE ENGINE ──
  passwordToggleBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    if (isPassword) {
      eyeIcon.classList.add("hidden");
      eyeOffIcon.classList.remove("hidden");
    } else {
      eyeIcon.classList.remove("hidden");
      eyeOffIcon.classList.add("hidden");
    }
  });

  // ── 4. SMOOTH AUTHENTICATION LAYOUT VIEW TOGGLE ──
  authSwitchBtn.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    authForm.reset();
    
    emailInput.classList.remove("input-error");
    passwordInput.classList.remove("input-error");
    emailWarn.classList.add("hidden");
    passwordWarn.classList.add("hidden");
    authAlertContainer.classList.add("hidden");
    
    passwordInput.type = "password";
    eyeIcon.classList.remove("hidden");
    eyeOffIcon.classList.add("hidden");

    if (isLoginMode) {
      authTitle.textContent = "Access Portal";
      authSubtitle.textContent = "Provide credentials to enter the operations center.";
      authSubmitBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Authorize Pipeline`;
      authSwitchBtn.innerHTML = `No account? <span>Register here</span>`;
    } else {
      authTitle.textContent = "Create Account";
      authSubtitle.textContent = "Register your identity to begin fact-checking.";
      authSubmitBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Provision Account`;
      authSwitchBtn.innerHTML = `Already provisioned? <span>Log in instead</span>`;
    }
  });

  // ── 5. REGISTRATION & LOGIN FORM HANDLING ENDPOINTS ──
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    let isValid = true;
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) {
      emailInput.classList.add("input-error");
      emailWarn.textContent = "Please fill out this field.";
      emailWarn.classList.remove("hidden");
      isValid = false;
    } else if (!email.includes("@")) {
      emailInput.classList.add("input-error");
      emailWarn.textContent = `Please include an '@' in the email address. '${email}' is missing an '@'.`;
      emailWarn.classList.remove("hidden");
      isValid = false;
    }

    const highSecurityRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!password) {
      passwordInput.classList.add("input-error");
      passwordWarn.textContent = "Please fill out this field.";
      passwordWarn.classList.remove("hidden");
      isValid = false;
    } else if (!highSecurityRegex.test(password)) {
      passwordInput.classList.add("input-error");
      passwordWarn.textContent = "Pass key must be at least 8 characters and contain letters, numbers, and special symbols (!@#$%^&*).";
      passwordWarn.classList.remove("hidden");
      isValid = false;
    }

    if (!isValid) return;

    authSubmitBtn.disabled = true;
    authSubmitBtn.innerHTML = `<span class="spinner"></span> Processing…`;

    try {
      const cleanUrl = RENDER_BACKEND_URL.replace(/\/$/, "");
      
      if (isLoginMode) {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const res = await fetch(`${cleanUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Login authentication failed.");

        chrome.storage.local.set({ token: data.access_token }, () => {
          authForm.reset();
          authScreen.classList.add("hidden");
          mainScreen.classList.remove("hidden");
        });
      } else {
        const res = await fetch(`${cleanUrl}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Account registration failed.");

        authSwitchBtn.click();
        authAlertContainer.className = "auth-alert success";
        authAlertContainer.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px"><path d="M20 6 9 17l-5-5"/></svg>
          Account created! Please log in to confirm credentials.
        `;
        authAlertContainer.classList.remove("hidden");
      }
    } catch (err) {
      authAlertContainer.className = "auth-alert error";
      authAlertContainer.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        ${err.message}
      `;
      authAlertContainer.classList.remove("hidden");
    } finally {
      authSubmitBtn.disabled = false;
      if (authSubmitBtn.disabled === false) {
        if (isLoginMode) {
          authSubmitBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Authorize Pipeline`;
        } else {
          authSubmitBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Provision Account`;
        }
      }
    }
  });

  // ── 6. LOGOUT AND REMOVE DATA TOKEN ──
  logoutBtn.addEventListener("click", () => {
    chrome.storage.local.remove(["token"], () => {
      outputDiv.className = "status-idle";
      outputDiv.textContent = "Click scan to begin analysis…";
      claimsHeading.classList.remove("visible");
      claimsContainer.innerHTML = "";
      
      mainScreen.classList.add("hidden");
      authScreen.classList.remove("hidden");
    });
  });

  // ── 7. SECURED SCAN ENGINE ANALYSIS ROUTE ──
  analyzeBtn.addEventListener("click", async () => {
    chrome.storage.local.get(["token"], async (store) => {
      const activeToken = store.token;
      if (!activeToken) {
        authScreen.classList.remove("hidden");
        mainScreen.classList.add("hidden");
        return;
      }

      claimsContainer.innerHTML = "";
      claimsHeading.classList.remove("visible");
      outputDiv.className = "status-wait";
      outputDiv.innerHTML = `<span style="display:flex;align-items:center;gap:8px"><span class="spinner"></span> Reading tab document DOM…</span>`;
      analyzeBtn.disabled = true;

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("Could not capture the active browser tab.");

        const [{ result: pageText }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.body.innerText,
        });

        if (!pageText || pageText.trim().length < 20) {
          throw new Error("Page contains insufficient text to analyze.");
        }

        outputDiv.innerHTML = `<span style="display:flex;align-items:center;gap:8px"><span class="spinner"></span> Forwarding payload to RAG engine…</span>`;

        const cleanUrl  = RENDER_BACKEND_URL.replace(/\/$/, "");
        const response  = await fetch(`${cleanUrl}/analyze`, {
          method:  "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeToken}`
          },
          body: JSON.stringify({
            url:  tab.url,
            text: pageText.substring(0, 4000),
          }),
        });

        if (response.status === 401) {
          chrome.storage.local.remove(["token"]);
          authScreen.classList.remove("hidden");
          mainScreen.classList.add("hidden");
          throw new Error("Session credentials expired. Please re-authenticate operator.");
        }

        if (!response.ok) throw new Error(`Backend returned status ${response.status}`);

        const data = await response.json();

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

        const claims = data.claims;
        if (Array.isArray(claims) && claims.length > 0) {
          claimsCount.textContent = `${claims.length} claim${claims.length !== 1 ? 's' : ''}`;
          claimsHeading.classList.add("visible");

          claims.forEach((claim) => {
            const rawVerdict = claim.verdict || "UNVERIFIED";
            const cs = resolveVerdictStyle(rawVerdict);

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
        analyzeBtn.disabled = false;
      }
    });
  });

  // ── 8. DASHBOARD INTERACTIVE LINK SWITCH ──
  dashboardBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://fake-news-detector-tawny.vercel.app" });
  });
});