import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../utils/apiFetch';
import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const BASE_URL = 'http://localhost:3000/server/ksp_datathon_function';

// ─── Mock fallbacks (used if /api/analytics not ready) ──────────────────────
const mockCrimeByDistrict = [
  { district: 'Bangalore Urban', count: 4821 },
  { district: 'Mysuru', count: 2134 },
  { district: 'Hubli-Dharwad', count: 1876 },
  { district: 'Mangaluru', count: 1654 },
  { district: 'Belagavi', count: 1432 },
  { district: 'Kalaburagi', count: 1201 },
  { district: 'Vijayapura', count: 987 },
  { district: 'Shivamogga', count: 876 },
];

const mockCrimeTrend = [
  { month: 'Jan', total: 1823, cyber: 432 },
  { month: 'Feb', total: 1654, cyber: 398 },
  { month: 'Mar', total: 1987, cyber: 521 },
  { month: 'Apr', total: 2134, cyber: 612 },
  { month: 'May', total: 1876, cyber: 487 },
  { month: 'Jun', total: 2341, cyber: 698 },
  { month: 'Jul', total: 2198, cyber: 634 },
];

const mockCrimeTypes = [
  { name: 'Cyber Crime', value: 4821, color: '#1A3A5C' },
  { name: 'Property Theft', value: 3104, color: '#C0392B' },
  { name: 'Assault', value: 2341, color: '#E8C547' },
  { name: 'Fraud', value: 1987, color: '#6B3A2A' },
  { name: 'Other', value: 1654, color: '#A0896B' },
];

const mockRepeatOffenders = [
  { name: 'Ramesh Kumar', cases: 5, district: 'Bangalore Urban' },
  { name: 'Suresh Rao', cases: 4, district: 'Mysuru' },
  { name: 'Priya Nair', cases: 4, district: 'Mangaluru' },
  { name: 'Mohan Das', cases: 3, district: 'Hubli-Dharwad' },
  { name: 'Anand Krishnan', cases: 3, district: 'Belagavi' },
];

const mockOfficerWorkload = [
  { name: 'Insp. Rajesh K', active: 8, solved: 24 },
  { name: 'SI Priya M', active: 6, solved: 18 },
  { name: 'ASI Suresh B', active: 11, solved: 15 },
  { name: 'Insp. Mohan R', active: 5, solved: 22 },
  { name: 'SI Anand T', active: 9, solved: 19 },
];

const mockInvestigationProgress = [
  { name: 'Under Investigation', value: 3210, color: '#E8C547' },
  { name: 'Charge Sheeted', value: 4100, color: '#1A3A5C' },
  { name: 'Closed/Undetected', value: 1732, color: '#C0392B' },
];

const mockModusOperandi = [
  { method: 'UPI Fraud', count: 1234 },
  { method: 'OTP Scam', count: 987 },
  { method: 'Card Cloning', count: 876 },
  { method: 'Phishing', count: 765 },
  { method: 'SIM Swap', count: 654 },
  { method: 'Online Cheating', count: 543 },
];

const mockSocioEconomic = [
  { bracket: 'Low Income', crimeRate: 42, urbanDensity: 78 },
  { bracket: 'Lower Middle', crimeRate: 38, urbanDensity: 65 },
  { bracket: 'Middle', crimeRate: 28, urbanDensity: 54 },
  { bracket: 'Upper Middle', crimeRate: 18, urbanDensity: 43 },
  { bracket: 'High Income', crimeRate: 12, urbanDensity: 32 },
];

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #E2D5C3', borderRadius: '8px', padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}>
      <p style={{ fontWeight: '700', color: '#1A3A5C', marginBottom: '4px' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{p.value?.toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Analytics Component ─────────────────────────────────────────────────────
const Analytics = () => {
  const [crimeByDistrict, setCrimeByDistrict] = useState(mockCrimeByDistrict);
  const [crimeTrend, setCrimeTrend] = useState(mockCrimeTrend);
  const [crimeTypes, setCrimeTypes] = useState(mockCrimeTypes);
  const [repeatOffenders, setRepeatOffenders] = useState(mockRepeatOffenders);
  const [officerWorkload, setOfficerWorkload] = useState(mockOfficerWorkload);
  const [investigationProgress, setInvestigationProgress] = useState(mockInvestigationProgress);
  const [modusOperandi, setModusOperandi] = useState(mockModusOperandi);
  const [socioEconomic, setSocioEconomic] = useState(mockSocioEconomic);

  // Try real API, fallback to mock
  useEffect(() => {
    apiFetch(`${BASE_URL}/api/analytics`)
      .then(data => {
        if (!data) return;
        // Map real API response to chart format
        // Matches mockApiService.getAnalytics() structure
        if (data.crime_head_distribution?.length) {
          setCrimeByDistrict(data.crime_head_distribution.map(d => ({
            district: d.crime_group_name,
            count: d.case_count,
          })));
        }
        if (data.gravity_metrics?.length) {
          setInvestigationProgress(data.gravity_metrics.map((g, i) => ({
            name: g.classification,
            value: g.active_count,
            color: ['#E8C547', '#1A3A5C', '#C0392B'][i] || '#A0896B',
          })));
        }
      })
      .catch(() => {
        // Keep mock data if API fails
      });
  }, []);

  const maxModus = Math.max(...modusOperandi.map(m => m.count));

  const s = {
    page: { minHeight: '100vh', background: '#F5F0E8', fontFamily: "'Inter', sans-serif" },
    wrap: { padding: '24px 28px' },
    header: { marginBottom: '24px' },
    title: { fontSize: '20px', fontWeight: '800', color: '#1A3A5C', marginBottom: '4px' },
    sub: { fontSize: '13px', color: '#6B3A2A', fontWeight: '500' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
    widget: (borderColor) => ({ background: '#fff', borderRadius: '10px', border: '1px solid #E2D5C3', borderTop: `3px solid ${borderColor}`, padding: '20px' }),
    span2: { gridColumn: 'span 2' },
    widgetTitle: { fontSize: '13px', fontWeight: '700', color: '#1A3A5C', marginBottom: '3px' },
    widgetDesc: { fontSize: '11px', color: '#A0896B', marginBottom: '16px' },
    offenderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F0E8DC' },
    offenderName: { fontSize: '13px', fontWeight: '600', color: '#1A3A5C' },
    offenderMeta: { fontSize: '11px', color: '#A0896B' },
    offenderBadge: { background: '#FDECEA', color: '#C0392B', border: '1px solid #C0392B', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: '700' },
    modusRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px', background: '#F5F0E8' },
    modusName: { fontSize: '13px', fontWeight: '500', color: '#1A3A5C' },
    modusCount: { fontSize: '12px', fontWeight: '700', color: '#C0392B' },
  };

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.wrap}>
        <div style={s.header}>
          <h1 style={s.title}>Analytics</h1>
          <p style={s.sub}>Karnataka State Police — Crime Intelligence Overview</p>
        </div>

        <div style={s.grid}>

          {/* 1. Crime by District */}
          <div style={s.widget('#1A3A5C')}>
            <div style={s.widgetTitle}>Crime by District</div>
            <div style={s.widgetDesc}>Distribution of FIRs across Karnataka districts</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={crimeByDistrict} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DC" />
                <XAxis dataKey="district" tick={{ fontSize: 9, fill: '#A0896B' }} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#A0896B' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="FIRs" fill="#1A3A5C" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 2. Crime Trend Over Time */}
          <div style={s.widget('#C0392B')}>
            <div style={s.widgetTitle}>Crime Trend Over Time</div>
            <div style={s.widgetDesc}>Monthly crime rate patterns and fluctuations</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={crimeTrend} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DC" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#A0896B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#A0896B' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="total" name="Total Crimes" stroke="#1A3A5C" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="cyber" name="Cyber Crime" stroke="#C0392B" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 3. Cyber Fraud Hotspots */}
          <div style={{ ...s.widget('#E8C547'), ...s.span2 }}>
            <div style={s.widgetTitle}>Cyber Fraud Hotspots</div>
            <div style={s.widgetDesc}>Crime type distribution across Karnataka</div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <ResponsiveContainer width="40%" height={200}>
                <PieChart>
                  <Pie data={crimeTypes} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {crimeTypes.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {crimeTypes.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: item.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: '13px', color: '#1A3A5C', fontWeight: '500' }}>{item.name}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: item.color }}>{item.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Repeat Offenders */}
          <div style={s.widget('#6B3A2A')}>
            <div style={s.widgetTitle}>Repeat Offenders</div>
            <div style={s.widgetDesc}>Persons with multiple active FIRs</div>
            {repeatOffenders.map((o, i) => (
              <div key={i} style={s.offenderRow}>
                <div>
                  <div style={s.offenderName}>{o.name}</div>
                  <div style={s.offenderMeta}>{o.district}</div>
                </div>
                <div style={s.offenderBadge}>{o.cases} cases</div>
              </div>
            ))}
          </div>

          {/* 5. Officer Workload */}
          <div style={s.widget('#1A3A5C')}>
            <div style={s.widgetTitle}>Officer Workload</div>
            <div style={s.widgetDesc}>Active and resolved cases per officer</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={officerWorkload} layout="vertical" margin={{ top: 0, right: 10, left: 70, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DC" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#A0896B' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#A0896B' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="active" name="Active" fill="#C0392B" radius={[0, 3, 3, 0]} />
                <Bar dataKey="solved" name="Solved" fill="#1A3A5C" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 6. Investigation Progress */}
          <div style={s.widget('#C0392B')}>
            <div style={s.widgetTitle}>Investigation Progress</div>
            <div style={s.widgetDesc}>Open vs closed cases and resolution rates</div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={investigationProgress} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {investigationProgress.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {investigationProgress.map((item, i) => (
                  <div key={i} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                      <span style={{ fontSize: '11px', color: '#6B3A2A', fontWeight: '500' }}>{item.name}</span>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: item.color, marginLeft: '18px' }}>
                      {item.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 7. Common Modus Operandi */}
          <div style={s.widget('#E8C547')}>
            <div style={s.widgetTitle}>Common Modus Operandi</div>
            <div style={s.widgetDesc}>Most frequently observed crime methods</div>
            {modusOperandi.map((item, i) => (
              <div key={i} style={s.modusRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={s.modusName}>{item.method}</span>
                    <span style={s.modusCount}>{item.count.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '4px', background: '#E2D5C3', borderRadius: '2px', position: 'relative' }}>
                    <div style={{ height: '4px', width: `${(item.count / maxModus) * 100}%`, background: '#C0392B', borderRadius: '2px' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 8. Socio-Economic Correlation */}
          <div style={{ ...s.widget('#6B3A2A'), ...s.span2 }}>
            <div style={s.widgetTitle}>Socio-Economic & Demographic Correlation</div>
            <div style={s.widgetDesc}>Crime rates mapped against economic and urban density indicators</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={socioEconomic} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DC" />
                <XAxis dataKey="bracket" tick={{ fontSize: 10, fill: '#A0896B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#A0896B' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="crimeRate" name="Crime Rate" stroke="#C0392B" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="urbanDensity" name="Urban Density Index" stroke="#1A3A5C" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Analytics;