import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiFetch, isRateLimitError, SYSTEM_BUSY_MESSAGE } from '../utils/apiFetch';
import { BASE_URL } from '../utils/config';

// ─── Status badge color ──────────────────────────────────────────────────────
const getStatusStyle = (status) => {
  if (status === 'Under Investigation') return { bg: '#FEF3CD', color: '#6B3A2A', border: '#E8C547' };
  if (status === 'Charge Sheeted') return { bg: '#FDECEA', color: '#C0392B', border: '#C0392B' };
  if (status === 'Closed') return { bg: '#E8F5E9', color: '#1A7A4A', border: '#1A7A4A' };
  return { bg: '#EBF2FA', color: '#1A3A5C', border: '#1A3A5C' };
};

// ─── Format date ────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

// ─── Search Component ────────────────────────────────────────────────────────
const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [systemBusy, setSystemBusy] = useState(false);
  const [error, setError] = useState(null);

  // ─── Handle Search ──────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setSearched(true);
    setSystemBusy(false);
    setError(null);
    setResults([]);

    try {
      // Real API call to live /api/fir/search endpoint
      const data = await apiFetch(
        `${BASE_URL}/api/fir/search?crime_no=${encodeURIComponent(query.trim())}`
      );
      setResults(data.data || []);
    } catch (err) {
      if (isRateLimitError(err)) {
        setSystemBusy(true);
      } else {
        setError('Search failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Enter key triggers search
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // ─── Styles ──────────────────────────────────────────────────────────────
  const s = {
    page: {
      minHeight: '100vh',
      background: '#F5F0E8',
      fontFamily: "'Inter', sans-serif",
    },
    wrap: {
      padding: '24px 28px',
      maxWidth: '900px',
      margin: '0 auto',
    },

    // Header
    header: { marginBottom: '20px' },
    title: { fontSize: '20px', fontWeight: '800', color: '#1A3A5C', marginBottom: '4px' },
    sub: { fontSize: '13px', color: '#6B3A2A', fontWeight: '500' },

    // Search bar
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
    searchInput: {
      flex: 1, border: 'none', outline: 'none',
      fontSize: '14px', color: '#1A3A5C', background: 'transparent',
    },
    searchBtn: (disabled) => ({
      padding: '9px 22px',
      background: disabled ? '#E2D5C3' : '#C0392B',
      color: disabled ? '#A0896B' : '#fff',
      border: 'none', borderRadius: '7px',
      fontSize: '13px', fontWeight: '700',
      cursor: disabled ? 'not-allowed' : 'pointer',
      whiteSpace: 'nowrap',
    }),

    // System busy
    systemBusyBanner: {
      background: '#FEF3CD',
      border: '1px solid #E8C547',
      borderLeft: '4px solid #C0392B',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
      fontSize: '13px', color: '#6B3A2A', fontWeight: '500',
    },

    // Error
    errorBanner: {
      background: '#FDECEA',
      border: '1px solid #C0392B',
      borderLeft: '4px solid #C0392B',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
      fontSize: '13px', color: '#C0392B', fontWeight: '500',
    },

    // Results area
    resultsArea: {
      background: '#fff',
      borderRadius: '10px',
      border: '1px solid #E2D5C3',
      minHeight: '400px',
      overflow: 'hidden',
    },

    // Results header
    resultsHeader: {
      padding: '14px 20px',
      borderBottom: '1px solid #E2D5C3',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
    },
    resultsCount: {
      fontSize: '13px', fontWeight: '600', color: '#1A3A5C',
    },
    resultsHint: {
      fontSize: '12px', color: '#A0896B',
    },

    // FIR Card
    firCard: {
      padding: '18px 20px',
      borderBottom: '1px solid #F0E8DC',
      cursor: 'pointer',
      transition: 'background 0.15s',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '16px',
    },
    firCardLeft: { flex: 1 },
    crimeNo: {
      fontSize: '14px', fontWeight: '700',
      color: '#1A3A5C', marginBottom: '6px',
      fontFamily: 'monospace',
    },
    briefFacts: {
      fontSize: '13px', color: '#6B3A2A',
      lineHeight: '1.5', marginBottom: '8px',
    },
    firMeta: {
      display: 'flex', gap: '12px',
      alignItems: 'center', flexWrap: 'wrap',
    },
    metaItem: {
      fontSize: '11px', color: '#A0896B',
      display: 'flex', alignItems: 'center', gap: '4px',
    },
    statusBadge: (status) => {
      const st = getStatusStyle(status);
      return {
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '11px', fontWeight: '700',
        background: st.bg, color: st.color,
        border: `1px solid ${st.border}`,
        whiteSpace: 'nowrap',
      };
    },
    viewBtn: {
      padding: '7px 14px',
      background: '#1A3A5C', color: '#fff',
      border: 'none', borderRadius: '7px',
      fontSize: '12px', fontWeight: '600',
      cursor: 'pointer', flexShrink: 0,
    },

    // Empty / loading states
    stateWrap: {
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '360px', gap: '10px',
    },
    stateIcon: { fontSize: '36px' },
    stateTitle: {
      fontSize: '14px', fontWeight: '700',
      color: '#1A3A5C',
    },
    stateSub: {
      fontSize: '13px', color: '#A0896B',
      textAlign: 'center', lineHeight: '1.5',
    },

    // Loading spinner
    spinner: {
      width: '32px', height: '32px',
      border: '3px solid #E2D5C3',
      borderTop: '3px solid #C0392B',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    },
  };

  return (
    <div style={s.page}>
      <Navbar />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .fir-card:hover { background: #FDFAF6 !important; }
      `}</style>

      <div style={s.wrap}>

        {/* Header */}
        <div style={s.header}>
          <h1 style={s.title}>Search</h1>
          <p style={s.sub}>Karnataka State Police — Crime Records</p>
        </div>

        {/* Search Bar */}
        <div style={s.searchBar}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          <input
            style={s.searchInput}
            type="text"
            placeholder="Search by FIR number, crime number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            style={s.searchBtn(isLoading || !query.trim())}
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* System Busy Banner */}
        {systemBusy && (
          <div style={s.systemBusyBanner}>
            ⚠️ {SYSTEM_BUSY_MESSAGE}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div style={s.errorBanner}>
            ⚠️ {error}
          </div>
        )}

        {/* Results Area */}
        <div style={s.resultsArea}>

          {/* Loading */}
          {isLoading && (
            <div style={s.stateWrap}>
              <div style={s.spinner} />
              <div style={s.stateTitle}>Searching records...</div>
            </div>
          )}

          {/* Not searched yet */}
          {!isLoading && !searched && (
            <div style={s.stateWrap}>
              <div style={s.stateIcon}>🔍</div>
              <div style={s.stateTitle}>Search for an investigation</div>
              <div style={s.stateSub}>
                Enter a FIR number or crime number above
              </div>
            </div>
          )}

          {/* No results */}
          {!isLoading && searched && results.length === 0 && !systemBusy && !error && (
            <div style={s.stateWrap}>
              <div style={s.stateIcon}>📭</div>
              <div style={s.stateTitle}>No records found</div>
              <div style={s.stateSub}>
                No FIRs matched your search query.{'\n'}
                Try a different crime number.
              </div>
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <>
              <div style={s.resultsHeader}>
                <span style={s.resultsCount}>
                  {results.length} record{results.length > 1 ? 's' : ''} found
                </span>
                <span style={s.resultsHint}>
                  Click a record to view full details
                </span>
              </div>

              {results.map((fir, index) => (
                <div
                  key={fir.CaseMasterID || index}
                  className="fir-card"
                  style={s.firCard}
                  onClick={() => navigate(`/fir/${fir.CrimeNo}`)}
                >
                  <div style={s.firCardLeft}>
                    {/* Crime Number */}
                    <div style={s.crimeNo}>
                      FIR: {fir.CrimeNo}
                    </div>

                    {/* Brief Facts */}
                    <div style={s.briefFacts}>
                      {fir.BriefFacts
                        ? fir.BriefFacts.length > 120
                          ? fir.BriefFacts.substring(0, 120) + '...'
                          : fir.BriefFacts
                        : 'No details available'
                      }
                    </div>

                    {/* Meta info */}
                    <div style={s.firMeta}>
                      <span style={s.metaItem}>
                        📅 {formatDate(fir.CrimeRegisteredDate)}
                      </span>
                      <span style={s.metaItem}>
                        🏛️ Station: {fir.PoliceStationID || 'N/A'}
                      </span>
                      {fir.accused_list?.length > 0 && (
                        <span style={s.metaItem}>
                          👤 {fir.accused_list.length} Accused
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <span style={s.statusBadge(fir.status)}>
                      {fir.status || 'Unknown'}
                    </span>
                    <button
                      style={s.viewBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/fir/${fir.CrimeNo}`);
                      }}
                    >
                      View FIR →
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;