import { useState } from 'react';
import { API_BASE_URL } from '../config';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Visibility toggle state
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
      errors.password = 'Security policy violation: Pass key must be at least 8 characters long and contain a mix of letters, numbers, and special symbols (!@#$%^&*).';
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
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">N</div>
          <h2>NeuralSieve <span>{isLogin ? 'Cascade / Access' : 'Cascade / Provision'}</span></h2>
          <p>{isLogin ? 'Provide keys to enter operations center' : 'Register identity bounds for data isolation'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && (
            <div className={`auth-alert ${error.includes('created') ? 'success' : 'error'}`}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>OPERATOR EMAIL</label>
            <input
              type="email"
              placeholder="operator@neuralsieve.local"
              className={fieldErrors.email ? 'input-error' : ''}
              value={email}
              onChange={(e) => handleInputChange('email', e.target.value, setEmail)}
            />
            {fieldErrors.email && (
              <div className="field-warn-msg">
                <WarningIcon /> {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>PASS KEY</label>
            {/* Input Wrapper for Absolute Positioning */}
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={fieldErrors.password ? 'input-error' : ''}
                value={password}
                onChange={(e) => handleInputChange('password', e.target.value, setPassword)}
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {fieldErrors.password && (
              <div className="field-warn-msg">
                <WarningIcon /> {fieldErrors.password}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? 'PROCESSING SECURE HANDSHAKE...' : isLogin ? 'AUTHORIZE PIPELINE' : 'PROVISION ACCOUNT'}
          </button>
        </form>

        <div className="auth-footer">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); setFieldErrors({ email: '', password: '' }); setShowPassword(false); }}>
            {isLogin ? "Need a new security profile? Register here" : "Identity already provisioned? Log in instead"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Custom SVG Components ── */
function WarningIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}