import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = ({ activePage }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { label: 'Chat', path: '/chat' },
    { label: 'Search', path: '/search' },
    { label: 'Analytics', path: '/analytics' },
  ];

  const styles = {
    navbar: {
      background: '#1A3A5C',
      padding: '0 28px',
      height: '58px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '3px solid #C0392B',
    },
    logoBox: {
      width: '34px', height: '34px',
      background: '#E8C547',
      borderRadius: '6px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#1A3A5C', fontSize: '11px', fontWeight: '800',
    },
    logoText: {
      fontWeight: '800', fontSize: '17px',
      color: '#fff', letterSpacing: '1px',
    },
    navLink: (active) => ({
      padding: '6px 18px', borderRadius: '6px',
      border: 'none', cursor: 'pointer',
      fontSize: '13px', fontWeight: active ? '600' : '500',
      background: active ? '#C0392B' : 'transparent',
      color: active ? '#fff' : 'rgba(255,255,255,0.65)',
    }),
    userName: {
      fontSize: '13px', fontWeight: '600', color: '#fff',
    },
    userRole: {
      fontSize: '11px', color: '#E8C547',
    },
    avatar: {
      width: '34px', height: '34px', borderRadius: '50%',
      background: '#6B3A2A', border: '2px solid #E8C547',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: '12px', fontWeight: '700',
    },
  };

  return (
    <nav style={styles.navbar}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={styles.logoBox}>KSP</div>
        <span style={styles.logoText}>ASTRA</span>
      </div>

      {/* Nav Links */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {links.map(link => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            style={styles.navLink(location.pathname === link.path)}
          >
            {link.label}
          </button>
        ))}
      </div>

      {/* User Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={styles.userName}> Inspector XYZ</div>
          <div style={styles.userRole}> ABC Police Station</div>
        </div>
        <div style={styles.avatar}>XY</div>
      </div>
    </nav>
  );
};

export default Navbar;