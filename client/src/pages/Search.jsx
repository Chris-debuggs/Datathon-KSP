import Navbar from '../components/Navbar';

const Search = () => {
  const styles = {
    page: {
      minHeight: '100vh',
      background: '#F5F0E8',
      fontFamily: "'Inter', sans-serif",
    },
    wrap: { padding: '24px 28px' },
    header: { marginBottom: '20px' },
    title: {
      fontSize: '20px', fontWeight: '800',
      color: '#1A3A5C', marginBottom: '3px',
    },
    sub: {
      fontSize: '13px', color: '#6B3A2A', fontWeight: '500',
    },
    searchBar: {
      background: '#fff',
      borderRadius: '10px',
      border: '1.5px solid #E2D5C3',
      borderLeft: '4px solid #C0392B',
      padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: '12px',
      marginBottom: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    input: {
      flex: 1, border: 'none', outline: 'none',
      fontSize: '14px', color: '#1A3A5C', background: 'transparent',
    },
    searchBtn: {
      padding: '8px 22px',
      background: '#C0392B', color: '#fff',
      border: 'none', borderRadius: '7px',
      fontSize: '13px', fontWeight: '700', cursor: 'pointer',
    },
    resultsArea: {
      background: '#fff',
      borderRadius: '10px',
      border: '1px solid #E2D5C3',
      minHeight: '480px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: {
      fontSize: '14px', fontWeight: '700',
      color: '#1A3A5C', marginBottom: '4px',
      textAlign: 'center',
    },
    emptySub: {
      fontSize: '13px', color: '#A0896B',
      textAlign: 'center',
    },
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.wrap}>
        <div style={styles.header}>
          <h1 style={styles.title}>Search</h1>
          <p style={styles.sub}>Karnataka State Police — Crime Records</p>
        </div>

        {/* Search Bar */}
        <div style={styles.searchBar}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          <input
            style={styles.input}
            type="text"
            placeholder="Search by FIR number, name, phone, UPI ID, vehicle, bank account..."
          />
          <button style={styles.searchBtn}>Search</button>
        </div>

        {/* Results Area */}
        <div style={styles.resultsArea}>
          <div>
            <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '10px' }}>🔍</div>
            <div style={styles.emptyTitle}>Search for an investigation</div>
            <div style={styles.emptySub}>Results will appear here</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;