import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  const styles = {
    page: {
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif",
      background: '#F5F0E8',
    },

    // Top bar
    topBar: {
      background: '#1A3A5C',
      borderBottom: '3px solid #C0392B',
      padding: '0 40px',
      height: '58px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    logoWrap: {
      display: 'flex', alignItems: 'center', gap: '10px',
    },
    logoBox: {
      width: '34px', height: '34px',
      background: '#E8C547', borderRadius: '6px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#1A3A5C', fontSize: '11px', fontWeight: '800',
    },
    logoText: {
      fontWeight: '800', fontSize: '17px',
      color: '#fff', letterSpacing: '1px',
    },
    loginBtn: {
      padding: '7px 20px',
      background: 'transparent',
      color: '#fff',
      border: '1.5px solid rgba(255,255,255,0.4)',
      borderRadius: '7px',
      fontSize: '13px', fontWeight: '600',
      cursor: 'pointer',
    },

    // Hero
    hero: {
      background: 'linear-gradient(135deg, #1A3A5C 0%, #6B3A2A 100%)',
      padding: '80px 40px',
      textAlign: 'center',
      borderBottom: '4px solid #E8C547',
    },
    badge: {
      display: 'inline-block',
      background: 'rgba(232,197,71,0.15)',
      border: '1px solid #E8C547',
      borderRadius: '20px',
      padding: '5px 16px',
      fontSize: '12px', fontWeight: '600',
      color: '#E8C547', letterSpacing: '0.5px',
      marginBottom: '24px',
    },
    heroTitle: {
      fontSize: '48px', fontWeight: '800',
      color: '#fff', marginBottom: '8px',
      letterSpacing: '2px',
    },
    heroSubtitle: {
      fontSize: '16px',
      color: 'rgba(255,255,255,0.6)',
      marginBottom: '32px',
    },
    heroBtn: {
      padding: '13px 36px',
      background: '#C0392B', color: '#fff',
      border: 'none', borderRadius: '8px',
      fontSize: '15px', fontWeight: '700',
      cursor: 'pointer', letterSpacing: '0.5px',
      marginRight: '12px',
    },
    heroSecBtn: {
      padding: '13px 36px',
      background: 'transparent', color: '#fff',
      border: '1.5px solid rgba(255,255,255,0.4)',
      borderRadius: '8px',
      fontSize: '15px', fontWeight: '600',
      cursor: 'pointer',
    },

    // Features
    featuresWrap: {
      padding: '56px 40px',
    },
    featuresTitle: {
      fontSize: '13px', fontWeight: '700',
      color: '#C0392B', textTransform: 'uppercase',
      letterSpacing: '1px', marginBottom: '8px',
      textAlign: 'center',
    },
    featuresHeading: {
      fontSize: '24px', fontWeight: '800',
      color: '#1A3A5C', textAlign: 'center',
      marginBottom: '40px',
    },
    featuresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px',
      maxWidth: '960px',
      margin: '0 auto',
    },
    featureCard: (borderColor) => ({
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #E2D5C3',
      borderTop: `3px solid ${borderColor}`,
      padding: '24px',
    }),
    featureIcon: {
      fontSize: '28px', marginBottom: '12px',
    },
    featureTitle: {
      fontSize: '14px', fontWeight: '700',
      color: '#1A3A5C', marginBottom: '8px',
    },
    featureDesc: {
      fontSize: '13px', color: '#6B3A2A',
      lineHeight: '1.6',
    },

    // Stats
    statsWrap: {
      background: '#1A3A5C',
      padding: '40px',
      display: 'flex',
      justifyContent: 'center',
      gap: '60px',
      borderTop: '3px solid #E8C547',
      borderBottom: '3px solid #E8C547',
    },
    stat: {
      textAlign: 'center',
    },
    statNumber: {
      fontSize: '32px', fontWeight: '800',
      color: '#E8C547', marginBottom: '4px',
    },
    statLabel: {
      fontSize: '13px', color: 'rgba(255,255,255,0.6)',
      fontWeight: '500',
    },

    // CTA
    ctaWrap: {
      padding: '56px 40px',
      textAlign: 'center',
      background: '#F5F0E8',
    },
    ctaTitle: {
      fontSize: '22px', fontWeight: '800',
      color: '#1A3A5C', marginBottom: '8px',
    },
    ctaSub: {
      fontSize: '14px', color: '#6B3A2A',
      marginBottom: '28px',
    },
    ctaBtn: {
      padding: '13px 40px',
      background: '#C0392B', color: '#fff',
      border: 'none', borderRadius: '8px',
      fontSize: '15px', fontWeight: '700',
      cursor: 'pointer', letterSpacing: '0.5px',
    },

    // Footer
    footer: {
      background: '#1A3A5C',
      borderTop: '3px solid #C0392B',
      padding: '20px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerLeft: {
      display: 'flex', alignItems: 'center', gap: '10px',
    },
    footerText: {
      fontSize: '12px', color: 'rgba(255,255,255,0.4)',
    },
  };

  const features = [
    {
      icon: '💬',
      title: 'Conversational AI',
      desc: 'Ask investigative questions in plain English or Kannada and get instant, contextual answers.',
      color: '#1A3A5C',
    },
    {
      icon: '🕸️',
      title: 'Relationship Graph',
      desc: 'Visualise connections between suspects, phones, bank accounts, UPI IDs and FIRs instantly.',
      color: '#C0392B',
    },
    {
      icon: '🔍',
      title: 'Smart FIR Search',
      desc: 'Search across 100,000+ FIRs by name, phone, vehicle, UPI ID, Aadhaar, or bank account.',
      color: '#E8C547',
    },
    {
      icon: '📊',
      title: 'Crime Analytics',
      desc: 'District-level dashboards showing crime trends, hotspots, and repeat offender patterns.',
      color: '#6B3A2A',
    },
    {
      icon: '🧠',
      title: 'Explainable AI',
      desc: 'Every AI response cites its sources — FIR IDs and evidence references shown transparently.',
      color: '#C0392B',
    },
    {
      icon: '📄',
      title: 'Investigation Reports',
      desc: 'Generate and download structured investigation reports with one click using jsPDF.',
      color: '#1A3A5C',
    },
  ];

  return (
    <div style={styles.page}>

      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.logoWrap}>
          <div style={styles.logoBox}>KSP</div>
          <span style={styles.logoText}>ASTRA</span>
        </div>
        <button style={styles.loginBtn} onClick={() => navigate('/login')}>
          Officer Login
        </button>
      </div>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.badge}>Karnataka State Police </div>
        <h1 style={styles.heroTitle}>ASTRA</h1>
        <p style={styles.heroSubtitle}>
          Agentic AI Investigation Platform for Karnataka State Police
        </p>
        <button style={styles.heroBtn} onClick={() => navigate('/login')}>
          Get Started
        </button>
        <button style={styles.heroSecBtn}>
          Learn More
        </button>
      </div>

      {/* Features */}
      <div style={styles.featuresWrap}>
        <p style={styles.featuresTitle}>Platform Capabilities</p>
        <h2 style={styles.featuresHeading}>
          Everything an investigator needs
        </h2>
        <div style={styles.featuresGrid}>
          {features.map((f, i) => (
            <div key={i} style={styles.featureCard(f.color)}>
              <div style={styles.featureIcon}>{f.icon}</div>
              <div style={styles.featureTitle}>{f.title}</div>
              <div style={styles.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsWrap}>
        <div style={styles.stat}>
          <div style={styles.statNumber}>100K+</div>
          <div style={styles.statLabel}>FIRs</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statNumber}>&lt; 3s</div>
          <div style={styles.statLabel}>AI Response Time</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statNumber}>90%+</div>
          <div style={styles.statLabel}>Retrieval Accuracy</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statNumber}>2</div>
          <div style={styles.statLabel}>Languages Supported</div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          <div style={{ ...styles.logoBox, width: '26px', height: '26px', fontSize: '9px' }}>KSP</div>
          <span style={{ ...styles.logoText, fontSize: '14px' }}>ASTRA</span>
        </div>
        <span style={styles.footerText}>
          Karnataka State Police — Authorised Personnel Only
        </span>
      </div>

    </div>
  );
};

export default Landing;