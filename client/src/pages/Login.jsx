import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../utils/config';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDemoFill = () => {
    setEmail('investigator@ksp.gov.in');
    setPassword('datathon2026');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        localStorage.setItem('astra_user', JSON.stringify(data.data));
        navigate('/chat');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Backend may be offline.');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    wrap: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1A3A5C 0%, #6B3A2A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
    },
    inner: {
      width: '100%', maxWidth: '420px', padding: '0 20px',
    },
    logoWrap: {
      textAlign: 'center', marginBottom: '28px',
    },
    logoBox: {
      width: '60px', height: '60px',
      background: '#E8C547', borderRadius: '12px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 14px',
      color: '#1A3A5C', fontSize: '14px', fontWeight: '800',
    },
    title: {
      fontSize: '26px', fontWeight: '800',
      color: '#fff', marginBottom: '4px', letterSpacing: '1px',
    },
    sub: {
      fontSize: '13px', color: 'rgba(255,255,255,0.6)',
    },
    card: {
      background: '#fff', borderRadius: '14px',
      padding: '32px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      borderTop: '4px solid #E8C547',
    },
    cardTitle: {
      fontSize: '15px', fontWeight: '700',
      color: '#1A3A5C', marginBottom: '22px',
    },
    label: {
      display: 'block', fontSize: '12px',
      fontWeight: '600', color: '#6B3A2A',
      marginBottom: '6px', textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    input: {
      width: '100%', padding: '11px 14px',
      border: '1.5px solid #E2D5C3',
      borderRadius: '8px', fontSize: '14px',
      color: '#1A3A5C', background: '#FDFAF6',
      outline: 'none', boxSizing: 'border-box',
      marginBottom: '16px',
    },
    btn: {
      width: '100%', padding: '12px',
      background: '#C0392B', color: '#fff',
      border: 'none', borderRadius: '8px',
      fontSize: '14px', fontWeight: '700',
      cursor: 'pointer', letterSpacing: '0.5px',
      marginTop: '8px',
    },
    demoBtn: {
      width: '100%', padding: '10px',
      background: '#FDFAF6', color: '#1A3A5C',
      border: '1.5px solid #E2D5C3', borderRadius: '8px',
      fontSize: '13px', fontWeight: '600',
      cursor: 'pointer', letterSpacing: '0.5px',
      marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
    },
    footer: {
      textAlign: 'center', fontSize: '12px',
      color: 'rgba(255,255,255,0.45)', marginTop: '20px',
    },
    error: {
      color: '#C0392B', fontSize: '12px', marginBottom: '12px', fontWeight: '600'
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.inner}>

        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoBox}>KSP</div>
          <h1 style={styles.title}>ASTRA</h1>
          <p style={styles.sub}>Karnataka State Police — Investigation Platform</p>
        </div>

        {/* Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Sign in to your account</h2>
          
          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleLogin}>
            <label style={styles.label}>Official Email</label>
            <input
              style={styles.input}
              type="email"
              autoComplete="username"
              placeholder="Enter your email address (e.g. investigator@gmail.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit"
              style={styles.btn}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
            
            <button
              type="button"
              style={styles.demoBtn}
              onClick={handleDemoFill}
              disabled={loading}
            >
              ⚡ Auto-fill Demo Login
            </button>
          </form>
        </div>

        <p style={styles.footer}>
          Karnataka State Police — Authorised Personnel Only
        </p>
      </div>
    </div>
  );
};

export default Login;