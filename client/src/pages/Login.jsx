import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();

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
    footer: {
      textAlign: 'center', fontSize: '12px',
      color: 'rgba(255,255,255,0.45)', marginTop: '20px',
    },
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

          <label style={styles.label}>Official Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="officer@ksp.gov.in"
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="••••••••"
          />

          <button
            style={styles.btn}
            onClick={() => navigate('/chat')}
          >
            Sign In
          </button>
        </div>

        <p style={styles.footer}>
          Karnataka State Police — Authorised Personnel Only
        </p>
      </div>
    </div>
  );
};

export default Login;