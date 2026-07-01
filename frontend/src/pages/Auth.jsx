import { useState } from 'react';
import { API_BASE_URL } from '../config';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });

  const validateForm = () => {
    let isValid = true;
    const errors = { email: '', password: '' };

    if (!email.trim()) {
      errors.email = 'Please fill out this field.';
      isValid = false;
    } else if (!email.includes('@')) {
      errors.email = `Please include an '@' in the email address. '${email}' is missing an '@'.`;
      isValid = false;
    }

    const highSecurityRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

    if (!password) {
      errors.password = 'Please fill out this field.';
      isValid = false;
    } else if (!highSecurityRegex.test(password)) {
      errors.password =
        'Pass key must be at least 8 characters and contain letters, numbers, and special symbols (!@#$%^&*).';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login authentication failed.');
        localStorage.setItem('token', data.access_token);
        onLoginSuccess(data.access_token);
      } else {
        const res = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Account registration failed.');
        setIsLogin(true);
        setError('Account created! Please log in to confirm credentials.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value, setter) => {
    setter(value);
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFieldErrors({ email: '', password: '' });
    setShowPassword(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:      #09090B;
          --bg2:     #0F1013;
          --bg3:     #141417;
          --bg4:     #18181C;
          --border:  rgba(255,255,255,0.06);
          --border2: rgba(255,255,255,0.10);
          --accent:  #4F8CFF;
          --accent2: #00D2A8;
          --text:    #F0F0F2;
          --text2:   #8B8D97;
          --text3:   #4B4D57;
          --ff:      'DM Sans', sans-serif;
          --ffm:     'DM Mono', monospace;
          --ffd:     'Syne', sans-serif;
          --r:       10px;
          --rl:      16px;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--ff);
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }

        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: var(--bg);
          position: relative;
          overflow: hidden;
        }

        /* subtle grid background */
        .auth-page::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(79,140,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79,140,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .auth-card {
          width: 100%;
          max-width: 420px;
          background: var(--bg2);
          border: 1px solid var(--border2);
          border-radius: var(--rl);
          overflow: hidden;
          position: relative;
          z-index: 1;
          box-shadow: 0 24px 64px rgba(0,0,0,.5);
        }

        /* top accent bar */
        .auth-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, var(--accent) 0%, var(--accent2) 60%, transparent 100%);
          opacity: .6;
        }

        /* ── HEADER ── */
        .auth-header {
          padding: 28px 28px 24px;
          border-bottom: 1px solid var(--border);
        }
        .auth-header-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .auth-logo {
          width: 32px; height: 32px;
          border-radius: 9px;
          background: var(--accent);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--ffd);
          font-size: 15px; font-weight: 800;
          color: #fff; flex-shrink: 0;
        }
        .auth-brand {
          font-family: var(--ffd);
          font-size: 15px; font-weight: 700;
          letter-spacing: -.4px; color: var(--text);
        }
        .auth-brand span { color: var(--text2); font-weight: 400; }

        .live-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: var(--ffm); font-size: 9px; font-weight: 500;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--accent2);
          padding: 4px 10px;
          border: 1px solid rgba(0,210,168,.2);
          background: rgba(0,210,168,.05);
          border-radius: 5px;
          margin-left: auto;
        }
        .live-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--accent2);
          animation: blink 2s ease infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }

        .auth-title {
          font-family: var(--ffd);
          font-size: 22px; font-weight: 800;
          letter-spacing: -1px; color: var(--text);
          margin-bottom: 6px;
        }
        .auth-subtitle {
          font-size: 13px; color: var(--text2); line-height: 1.6;
        }

        /* ── FORM BODY ── */
        .auth-form-body {
          padding: 24px 28px 28px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* ── ALERT ── */
        .auth-alert {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 11px 14px;
          border-radius: var(--r);
          font-size: 13px; line-height: 1.55;
        }
        .auth-alert.error {
          background: rgba(255,93,115,.07);
          border: 1px solid rgba(255,93,115,.2);
          color: #FF5D73;
        }
        .auth-alert.success {
          background: rgba(0,200,150,.07);
          border: 1px solid rgba(0,200,150,.2);
          color: #00C896;
        }

        /* ── FORM GROUP ── */
        .form-group { display: flex; flex-direction: column; gap: 7px; }

        .form-group label {
          font-family: var(--ffm);
          font-size: 9px; font-weight: 500;
          letter-spacing: 1.8px; text-transform: uppercase;
          color: var(--text3);
        }

        .form-group input {
          width: 100%;
          padding: 11px 14px;
          background: var(--bg3);
          border: 1px solid var(--border2);
          border-radius: var(--r);
          color: var(--text);
          font-family: var(--ff);
          font-size: 13.5px;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .form-group input:focus {
          border-color: rgba(79,140,255,.5);
          box-shadow: 0 0 0 3px rgba(79,140,255,.08);
        }
        .form-group input::placeholder { color: var(--text3); }
        .form-group input.input-error {
          border-color: rgba(255,93,115,.45);
          box-shadow: 0 0 0 3px rgba(255,93,115,.07);
        }

        /* password wrapper */
        .password-wrapper { position: relative; }
        .password-wrapper input { padding-right: 44px; }
        .password-toggle-btn {
          position: absolute; top: 50%; right: 12px;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--text3); display: flex; align-items: center;
          padding: 4px; border-radius: 5px;
          transition: color .15s, background .15s;
        }
        .password-toggle-btn:hover { color: var(--text2); background: var(--bg4); }

        /* field error */
        .field-warn-msg {
          display: flex; align-items: flex-start; gap: 7px;
          font-size: 11.5px; color: #FF5D73;
          font-family: var(--ffm); line-height: 1.5;
        }

        /* ── SUBMIT BUTTON ── */
        .auth-submit-btn {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          padding: 12px 20px;
          background: var(--accent);
          color: #fff; border: none;
          border-radius: var(--r);
          font-family: var(--ff);
          font-size: 13px; font-weight: 600;
          letter-spacing: .3px;
          cursor: pointer;
          transition: all .2s;
          margin-top: 4px;
        }
        .auth-submit-btn:hover:not(:disabled) {
          background: #6BA3FF;
          transform: translateY(-1px);
        }
        .auth-submit-btn:disabled { opacity: .38; cursor: not-allowed; transform: none; }

        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin .7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── FOOTER ── */
        .auth-footer {
          padding: 16px 28px 20px;
          border-top: 1px solid var(--border);
          text-align: center;
        }
        .auth-footer button {
          background: none; border: none; cursor: pointer;
          font-size: 12.5px; color: var(--text2);
          font-family: var(--ff);
          transition: color .18s;
        }
        .auth-footer button:hover { color: var(--accent); }
        .auth-footer button span { color: var(--accent); font-weight: 500; }
      `}</style>

      <div className="auth-page">
        <div className="auth-card">

          {/* ── HEADER ── */}
          <div className="auth-header">
            <div className="auth-header-top">
              <div className="auth-logo">N</div>
              <div className="auth-brand">
                NeuralSieve <span>Cascade</span>
              </div>
              <div className="live-badge">
                <span className="live-dot" />
                Live
              </div>
            </div>
            <div className="auth-title">
              {isLogin ? 'Access Portal' : 'Create Account'}
            </div>
            <div className="auth-subtitle">
              {isLogin
                ? 'Provide credentials to enter the operations center.'
                : 'Register your identity to begin fact-checking.'}
            </div>
          </div>

          {/* ── FORM ── */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-form-body">

              {error && (
                <div className={`auth-alert ${error.includes('created') ? 'success' : 'error'}`}>
                  {error.includes('created') ? <CheckIcon /> : <WarnIcon />}
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="form-group">
                <label>Operator Email</label>
                <input
                  type="email"
                  placeholder="operator@neuralsieve.local"
                  className={fieldErrors.email ? 'input-error' : ''}
                  value={email}
                  onChange={e => handleInputChange('email', e.target.value, setEmail)}
                />
                {fieldErrors.email && (
                  <div className="field-warn-msg">
                    <WarnIcon /> {fieldErrors.email}
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="form-group">
                <label>Pass Key</label>
                <div className="password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={fieldErrors.password ? 'input-error' : ''}
                    value={password}
                    onChange={e => handleInputChange('password', e.target.value, setPassword)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex="-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <div className="field-warn-msg">
                    <WarnIcon /> {fieldErrors.password}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? (
                  <><span className="spinner" /> Processing…</>
                ) : isLogin ? (
                  <><LockIcon /> Authorize Pipeline</>
                ) : (
                  <><PlusIcon /> Provision Account</>
                )}
              </button>
            </div>
          </form>

          {/* ── FOOTER ── */}
          <div className="auth-footer">
            <button onClick={switchMode}>
              {isLogin
                ? <>No account? <span>Register here</span></>
                : <>Already provisioned? <span>Log in instead</span></>}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

/* ── Icons ── */
function WarnIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}