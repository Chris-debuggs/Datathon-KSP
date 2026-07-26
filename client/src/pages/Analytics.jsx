import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../utils/apiFetch';
import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import * as d3 from 'd3';
import { BASE_URL } from '../utils/config';

// Mock data removed in Phase 4 Audit

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
  const [crimeByDistrict, setCrimeByDistrict] = useState([]);
  const [crimeTypes, setCrimeTypes] = useState([]);
  const [investigationProgress, setInvestigationProgress] = useState([]);
  
  // States for new metrics from ZCQL
  const [totalCases, setTotalCases] = useState(0);
  const [arrestCount, setArrestCount] = useState(0);
  const [chargesheetCount, setChargesheetCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${BASE_URL}/api/analytics`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          const apiData = data.data;
          
          setTotalCases(apiData.totalCases || 0);
          setArrestCount(apiData.arrestCount || 0);
          setChargesheetCount(apiData.chargesheetCount || 0);

          setCrimeByDistrict(apiData.unitWorkload.map(u => ({
            district: u.unit,
            count: u.count
          })));

          setCrimeTypes(apiData.crimeTypes.map((c, i) => ({
            name: c.label,
            value: c.value,
            color: ['#1A3A5C', '#C0392B', '#E8C547', '#6B3A2A', '#A0896B'][i % 5]
          })));

          setInvestigationProgress(apiData.statusBreakdown.map((s, i) => ({
            name: s.status,
            value: s.count,
            color: ['#E8C547', '#1A3A5C', '#C0392B'][i % 3] || '#A0896B'
          })));
        } else {
          setError(data.message || 'Failed to fetch analytics.');
        }
      })
      .catch(err => {
        setError('Network error. Analytics backend offline.');
      })
      .finally(() => setIsLoading(false));
  }, []);

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

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#6B3A2A' }}>
            <p style={{ fontWeight: '600', fontSize: '18px' }}>Aggregating Live ZCQL Metrics...</p>
          </div>
        ) : error ? (
          <div style={{ background: '#C0392B', color: '#fff', padding: '16px', borderRadius: '8px', fontWeight: '600' }}>
            {error}
          </div>
        ) : (
          <div style={s.grid}>

            {/* 1. Total Cases Overview */}
            <div style={{ ...s.widget('#1A3A5C'), ...s.span2, display: 'flex', gap: '40px', alignItems: 'center' }}>
              <div>
                <div style={s.widgetTitle}>Total Registered FIRs</div>
                <div style={s.widgetDesc}>Live Datastore Count</div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#1A3A5C' }}>{totalCases.toLocaleString()}</div>
              </div>
              <div style={{ height: '50px', width: '2px', background: '#F0E8DC' }} />
              <div>
                <div style={s.widgetTitle}>Total Arrests Made</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#C0392B' }}>{arrestCount.toLocaleString()}</div>
              </div>
              <div style={{ height: '50px', width: '2px', background: '#F0E8DC' }} />
              <div>
                <div style={s.widgetTitle}>Total Chargesheets Filed</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#6B3A2A' }}>{chargesheetCount.toLocaleString()}</div>
              </div>
            </div>

            {/* 2. Crime by District */}
            <div style={{ ...s.widget('#1A3A5C'), ...s.span2 }}>
              <div style={s.widgetTitle}>Crime by District / Unit</div>
              <div style={s.widgetDesc}>Distribution of FIRs across Karnataka units</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={crimeByDistrict} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DC" />
                  <XAxis dataKey="district" tick={{ fontSize: 9, fill: '#A0896B' }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#A0896B' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="FIRs" fill="#1A3A5C" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 3. Cyber Fraud Hotspots */}
            <div style={s.widget('#E8C547')}>
              <div style={s.widgetTitle}>Crime Type Breakdown</div>
              <div style={s.widgetDesc}>Distribution across main crime heads</div>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <ResponsiveContainer width="50%" height={200}>
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

            {/* 4. Investigation Progress */}
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

          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;