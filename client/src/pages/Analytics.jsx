import Navbar from '../components/Navbar';

const widgets = [
  {
    title: 'Crime by District',
    desc: 'Distribution of FIRs across Karnataka districts',
    color: '#1A3A5C', span: 1, height: '130px',
  },
  {
    title: 'Crime Trend Over Time',
    desc: 'Monthly crime rate patterns and fluctuations',
    color: '#C0392B', span: 1, height: '130px',
  },
  {
    title: 'Cyber Fraud Hotspots',
    desc: 'Geographic concentration of cyber fraud cases',
    color: '#E8C547', span: 2, height: '110px',
  },
  {
    title: 'Repeat Offenders',
    desc: 'Persons with multiple active FIRs',
    color: '#6B3A2A', span: 1, height: '130px',
  },
  {
    title: 'Officer Workload',
    desc: 'Active and resolved cases per officer',
    color: '#1A3A5C', span: 1, height: '130px',
  },
  {
    title: 'Investigation Progress',
    desc: 'Open vs closed cases and resolution rates',
    color: '#C0392B', span: 1, height: '130px',
  },
  {
    title: 'Common Modus Operandi',
    desc: 'Most frequently observed crime methods',
    color: '#E8C547', span: 1, height: '130px',
  },
  {
    title: 'Socio-Economic & Demographic Correlation',
    desc: 'Crime rates mapped against economic and urban density indicators',
    color: '#6B3A2A', span: 2, height: '110px',
  },
];

const Analytics = () => {
  const styles = {
    page: {
      minHeight: '100vh',
      background: '#F5F0E8',
      fontFamily: "'Inter', sans-serif",
    },
    wrap: { padding: '24px 28px' },
    header: { marginBottom: '24px' },
    title: {
      fontSize: '20px', fontWeight: '800',
      color: '#1A3A5C', marginBottom: '3px',
    },
    sub: {
      fontSize: '13px', color: '#6B3A2A', fontWeight: '500',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
    },
    widget: (color, span) => ({
      background: '#fff',
      borderRadius: '10px',
      border: '1px solid #E2D5C3',
      borderTop: `3px solid ${color}`,
      padding: '18px',
      gridColumn: span === 2 ? 'span 2' : 'span 1',
    }),
    widgetTitle: {
      fontSize: '13px', fontWeight: '700',
      color: '#1A3A5C', marginBottom: '3px',
    },
    widgetDesc: {
      fontSize: '12px', color: '#A0896B', marginBottom: '12px',
    },
    chartPlaceholder: (height) => ({
      background: '#F5F0E8',
      border: '1px dashed #C8B89A',
      borderRadius: '8px',
      height: height,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }),
    chartText: {
      fontSize: '12px', color: '#C8B89A', fontWeight: '500',
    },
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.wrap}>
        <div style={styles.header}>
          <h1 style={styles.title}>Analytics</h1>
          <p style={styles.sub}>Karnataka State Police — Crime Intelligence Overview</p>
        </div>

        <div style={styles.grid}>
          {widgets.map((w, i) => (
            <div key={i} style={styles.widget(w.color, w.span)}>
              <div style={styles.widgetTitle}>{w.title}</div>
              <div style={styles.widgetDesc}>{w.desc}</div>
              <div style={styles.chartPlaceholder(w.height)}>
                <span style={styles.chartText}>Chart renders here</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;