import Navbar from '../components/Navbar';

const mockHistory = [
  { id: 1, title: 'UPI Fraud — Case #4421', time: '2h ago' },
  { id: 2, title: 'Vehicle theft @ ABC 8th Street', time: 'Yesterday' },
  { id: 3, title: 'Cyber scam — Case #3105', time: '3 days ago' },
];

const Chat = () => {
  const styles = {
    page: {
      minHeight: '100vh',
      background: '#F5F0E8',
      fontFamily: "'Inter', sans-serif",
    },
    layout: {
      display: 'flex',
      height: 'calc(100vh - 61px)',
    },

    // Sidebar
    sidebar: {
      width: '240px',
      background: '#1A3A5C',
      padding: '16px',
      flexShrink: 0,
      overflowY: 'auto',
      borderRight: '3px solid #6B3A2A',
    },
    sidebarLabel: {
      fontSize: '10px', fontWeight: '700',
      color: '#E8C547', textTransform: 'uppercase',
      letterSpacing: '1px', marginBottom: '12px',
      display: 'block',
    },
    sidebarItem: (active) => ({
      padding: '10px 12px', borderRadius: '8px',
      marginBottom: '6px', cursor: 'pointer',
      borderLeft: `3px solid ${active ? '#E8C547' : 'transparent'}`,
      background: active ? 'rgba(232,197,71,0.15)' : 'transparent',
    }),
    sidebarTitle: {
      fontSize: '13px', fontWeight: '500',
      color: '#fff', marginBottom: '2px',
    },
    sidebarTime: {
      fontSize: '11px', color: 'rgba(255,255,255,0.4)',
    },
    newChatBtn: {
      width: '100%', marginTop: '14px', padding: '10px',
      background: '#E8C547', color: '#1A3A5C',
      border: 'none', borderRadius: '8px',
      fontSize: '13px', fontWeight: '700', cursor: 'pointer',
    },

    // Chat main
    chatMain: {
      flex: 1, display: 'flex', flexDirection: 'column',
      background: '#F5F0E8',
    },
    messages: {
      flex: 1, padding: '24px', overflowY: 'auto',
    },
    intro: {
      background: '#fff',
      border: '1px solid #E2D5C3',
      borderLeft: '4px solid #1A3A5C',
      borderRadius: '10px',
      padding: '18px 22px',
      marginBottom: '20px',
      maxWidth: '680px',
    },
    introTitle: {
      fontSize: '13px', fontWeight: '700',
      color: '#1A3A5C', marginBottom: '6px',
      textTransform: 'uppercase', letterSpacing: '0.5px',
    },
    introText: {
      fontSize: '14px', color: '#4A3728', lineHeight: '1.6',
    },
    officerMsg: {
      display: 'flex', justifyContent: 'flex-end', marginBottom: '16px',
    },
    officerBubble: {
      background: '#6B3A2A', color: '#fff',
      borderRadius: '14px 14px 2px 14px',
      padding: '12px 16px', maxWidth: '480px',
      fontSize: '14px', lineHeight: '1.5',
    },
    aiMsg: {
      maxWidth: '680px', marginBottom: '16px',
    },
    aiBubble: {
      background: '#fff',
      border: '1px solid #E2D5C3',
      borderLeft: '4px solid #C0392B',
      borderRadius: '2px 14px 14px 14px',
      padding: '14px 16px',
      fontSize: '14px', color: '#1A3A5C', lineHeight: '1.6',
    },
    xaiTags: {
      display: 'flex', gap: '6px',
      marginTop: '8px', flexWrap: 'wrap', alignItems: 'center',
    },
    xaiTag: {
      fontSize: '11px', fontWeight: '600',
      color: '#1A3A5C', background: '#FEF9E7',
      border: '1px solid #E8C547',
      borderRadius: '4px', padding: '2px 8px', cursor: 'pointer',
    },
    xaiLabel: {
      fontSize: '11px', color: '#A0896B',
    },

    // Input bar
    inputBar: {
      background: '#fff',
      borderTop: '2px solid #E2D5C3',
      padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: '10px',
    },
    input: {
      flex: 1, padding: '10px 14px',
      border: '1.5px solid #E2D5C3',
      borderRadius: '8px', fontSize: '14px',
      color: '#1A3A5C', outline: 'none', background: '#FDFAF6',
    },
    micBtn: {
      width: '40px', height: '40px', borderRadius: '50%',
      border: '1.5px solid #E2D5C3', background: '#FDFAF6',
      cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: '17px',
    },
    sendBtn: {
      width: '40px', height: '40px', borderRadius: '50%',
      border: 'none', background: '#C0392B', cursor: 'pointer',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#fff', fontSize: '15px',
    },
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.layout}>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          <span style={styles.sidebarLabel}>Recent Conversations</span>
          {mockHistory.map(item => (
            <div key={item.id} style={styles.sidebarItem(item.id === 1)}>
              <div style={styles.sidebarTitle}>{item.title}</div>
              <div style={styles.sidebarTime}>{item.time}</div>
            </div>
          ))}
          <button style={styles.newChatBtn}>+ New Investigation</button>
        </div>

        {/* Chat Main */}
        <div style={styles.chatMain}>
          <div style={styles.messages}>

            {/* Intro */}
            <div style={styles.intro}>
              <div style={styles.introTitle}>ASTRA Investigation Assistant</div>
              <div style={styles.introText}>
                Good morning, XYZ. How can I assist your investigation today?
                Ask me about FIRs, suspects, vehicles, UPI transactions,
                or request a relationship analysis.
              </div>
            </div>

            {/* Officer Message */}
            <div style={styles.officerMsg}>
              <div style={styles.officerBubble}>
                Find all cyber fraud cases linked to UPI ID 9876543210@paytm
              </div>
            </div>

            {/* AI Response */}
            <div style={styles.aiMsg}>
              <div style={styles.aiBubble}>
                Found <strong>3 FIRs</strong> linked to UPI ID{' '}
                <strong>9876543210@paytm</strong>. The account is associated
                with a known cyber fraud network operating across Bangalore
                Urban district.
              </div>
              <div style={styles.xaiTags}>
                {['FIR-2024-4421', 'FIR-2024-3892', 'FIR-2024-3105'].map(tag => (
                  <span key={tag} style={styles.xaiTag}>{tag}</span>
                ))}
                <span style={styles.xaiLabel}>· Sources</span>
              </div>
            </div>

          </div>

          {/* Input Bar */}
          <div style={styles.inputBar}>
            <input
              style={styles.input}
              type="text"
              placeholder="Ask about a case, suspect, vehicle, UPI ID..."
            />
            <button style={styles.micBtn}>🎤</button>
            <button style={styles.sendBtn}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;