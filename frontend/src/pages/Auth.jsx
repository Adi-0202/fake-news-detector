import { useState } from 'react';
import { API_BASE_URL } from '../config';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // OAuth2 Form-encoded payload format matching backend bouncer
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
        // Standard JSON payload format matching UserCreateSchema
        const res = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Account registration failed.');

        // Instantly toggle to login mode on clean signup success
        setIsLogin(true);
        setError('Account created! Please log in to confirm credentials.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className={`auth-alert ${error.includes('created') ? 'success' : 'error'}`}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>OPERATOR EMAIL</label>
            <input
              type="email"
              required
              placeholder="operator@neuralsieve.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>PASS KEY</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? 'PROCESSING SECURE HANDSHAKE...' : isLogin ? 'AUTHORIZE PIPELINE' : 'PROVISION ACCOUNT'}
          </button>
        </form>

        <div className="auth-footer">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? "Need a new security profile? Register here" : "Identity already provisioned? Log in instead"}
          </button>
        </div>
      </div>
    </div>
  );
}