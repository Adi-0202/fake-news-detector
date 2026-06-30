import { useState } from 'react';
import { API_BASE_URL } from '../config';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Separate state tree to trace targeted field errors
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });

  const validateForm = () => {
    let isValid = true;
    const errors = { email: '', password: '' };

    // Email client-side validation
    if (!email.trim()) {
      errors.email = 'Please fill out this field.';
      isValid = false;
    } else if (!email.includes('@')) {
      errors.email = `Please include an '@' in the email address. '${email}' is missing an '@'.`;
      isValid = false;
    }

    // Password client-side validation
    if (!password) {
      errors.password = 'Please fill out this field.';
      isValid = false;
    } else if (password.length < 6) {
      errors.password = `Please lengthen this text to 6 characters or more (you are currently using ${password.length} character${password.length > 1 ? 's' : ''}).`;
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // 2. Run our custom theme-matched validation cascade
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

  // Clear specific field tracking error as the operator edits inputs
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

        {/* 3. added noValidate here to completely disable native popups */}
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
            {/* Custom Field Error Component */}
            {fieldErrors.email && (
              <div className="field-warn-msg">
                <WarningIcon /> {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>PASS KEY</label>
            <input
              type="password"
              placeholder="••••••••"
              className={fieldErrors.password ? 'input-error' : ''}
              value={password}
              onChange={(e) => handleInputChange('password', e.target.value, setPassword)}
            />
            {/* Custom Field Error Component */}
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
          <button onClick={() => { setIsLogin(!isLogin); setError(''); setFieldErrors({ email: '', password: '' }); }}>
            {isLogin ? "Need a new security profile? Register here" : "Identity already provisioned? Log in instead"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}