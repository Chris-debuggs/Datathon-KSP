import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ExportReport from '../components/ExportReport';
import { apiFetch, isRateLimitError } from '../utils/apiFetch';
import { BASE_URL } from '../utils/config';

// Mock data purged in Phase 4 Audit

const getStatusColor = (status) => {
    if (status === 'Under Investigation') return { bg: '#FEF3CD', color: '#6B3A2A', border: '#E8C547' };
    if (status === 'Charge Sheeted') return { bg: '#FDECEA', color: '#C0392B', border: '#C0392B' };
    if (status === 'Closed') return { bg: '#E8F5E9', color: '#1A7A4A', border: '#1A7A4A' };
    return { bg: '#EBF2FA', color: '#1A3A5C', border: '#1A3A5C' };
};

const FIRDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const reportRef = useRef(null);
    const [fir, setFir] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadFIR = async () => {
            setIsLoading(true);
            try {
                const data = await apiFetch(`${BASE_URL}/api/fir/${id}`);
                setFir(data?.data || null);
            } catch {
                setFir(null);
            } finally {
                setIsLoading(false);
            }
        };
        loadFIR();
    }, [id]);

    const statusColors = fir ? getStatusColor(fir.status) : {};

    const s = {
        page: { minHeight: '100vh', background: '#F5F0E8', fontFamily: "'Inter', sans-serif" },
        wrap: { padding: '24px 28px', maxWidth: '1100px', margin: '0 auto' },
        header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' },
        backBtn: { background: 'none', border: 'none', color: '#6B3A2A', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', padding: 0 },
        firNumber: { fontSize: '20px', fontWeight: '800', color: '#1A3A5C', marginBottom: '4px' },
        firMeta: { fontSize: '13px', color: '#6B3A2A', fontWeight: '500' },
        statusBadge: { display: 'inline-block', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: statusColors.bg, color: statusColors.color, border: `1px solid ${statusColors.border}`, marginTop: '8px' },
        actionBtns: { display: 'flex', gap: '10px', flexShrink: 0 },
        graphBtn: { padding: '9px 16px', background: '#6B3A2A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
        grid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' },
        leftCol: { display: 'flex', flexDirection: 'column', gap: '16px' },
        rightCol: { display: 'flex', flexDirection: 'column', gap: '16px' },
        card: (borderColor = '#1A3A5C') => ({ background: '#fff', borderRadius: '10px', border: '1px solid #E2D5C3', borderTop: `3px solid ${borderColor}`, padding: '20px' }),
        cardTitle: { fontSize: '12px', fontWeight: '700', color: '#6B3A2A', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' },
        cardText: { fontSize: '14px', color: '#1A3A5C', lineHeight: '1.7' },
        personCard: { background: '#F5F0E8', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px', border: '1px solid #E2D5C3' },
        personName: { fontSize: '14px', fontWeight: '700', color: '#1A3A5C', marginBottom: '4px' },
        personMeta: { fontSize: '12px', color: '#6B3A2A' },
        personBadge: (type) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', background: type === 'Accused' ? '#FDECEA' : '#EBF2FA', color: type === 'Accused' ? '#C0392B' : '#1A3A5C', marginBottom: '6px' }),
        timelineItem: { display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'flex-start' },
        timelineDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#1A3A5C', flexShrink: 0, marginTop: '4px' },
        timelineDate: { fontSize: '11px', color: '#A0896B', fontWeight: '600', marginBottom: '2px' },
        timelineEvent: { fontSize: '13px', color: '#1A3A5C' },
        evidenceItem: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', padding: '10px 12px', background: '#F5F0E8', borderRadius: '8px', border: '1px solid #E2D5C3' },
        evidenceText: { fontSize: '13px', color: '#1A3A5C', fontWeight: '500' },
        evidenceType: { fontSize: '10px', color: '#A0896B' },
        actionItem: { display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px', fontSize: '13px', color: '#1A3A5C', lineHeight: '1.5' },
        actionBullet: { color: '#C0392B', fontWeight: '700', flexShrink: 0, fontSize: '16px' },
        xaiRow: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' },
        xaiTag: { fontSize: '11px', fontWeight: '600', color: '#1A3A5C', background: '#FEF9E7', border: '1px solid #E8C547', borderRadius: '4px', padding: '2px 8px' },
        xaiLabel: { fontSize: '11px', color: '#A0896B', marginBottom: '6px', display: 'block' },
        loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontSize: '14px', color: '#A0896B' },
    };

    if (isLoading) return <div style={s.page}><Navbar /><div style={s.loading}>Loading FIR details...</div></div>;
    if (!fir) return <div style={s.page}><Navbar /><div style={s.loading}>FIR not found.</div></div>;

    return (
        <div style={s.page}>
            <Navbar />
            <div style={s.wrap} ref={reportRef}>

                {/* Header */}
                <div style={s.header}>
                    <div>
                        <button style={s.backBtn} onClick={() => navigate(-1)}>← Back</button>
                        <div style={s.firNumber}>FIR: {fir.CrimeNo}</div>
                        <div style={s.firMeta}>
                            {fir.policeStation} · {fir.district} · {new Date(fir.CrimeRegisteredDate).toLocaleDateString('en-IN')}
                        </div>
                        <div style={s.statusBadge}>{fir.status}</div>
                    </div>
                    <div style={s.actionBtns}>
                        <button style={s.graphBtn} onClick={() => navigate('/graph')}>🕸️ View Graph</button>
                        <ExportReport targetRef={reportRef} filename={`FIR_${fir.CrimeNo}`} label="Export PDF" />
                    </div>
                </div>

                {/* Grid */}
                <div style={s.grid}>
                    <div style={s.leftCol}>

                        <div style={s.card('#1A3A5C')}>
                            <div style={s.cardTitle}>Incident Overview</div>
                            <div style={s.cardText}>{fir.BriefFacts}</div>
                        </div>

                        <div style={s.card('#C0392B')}>
                            <div style={s.cardTitle}>Accused ({fir.accused_list.length})</div>
                            {fir.accused_list.map((acc, i) => (
                                <div key={i} style={s.personCard}>
                                    <div style={s.personBadge('Accused')}>ACCUSED</div>
                                    <div style={s.personName}>{acc.AccusedName}</div>
                                    <div style={s.personMeta}>{acc.PersonID} · Age: {acc.AgeYear} · Gender: {acc.GenderID}</div>
                                </div>
                            ))}
                        </div>

                        <div style={s.card('#E8C547')}>
                            <div style={s.cardTitle}>Victims ({fir.victim_list.length})</div>
                            {fir.victim_list.map((vic, i) => (
                                <div key={i} style={s.personCard}>
                                    <div style={s.personBadge('Victim')}>VICTIM</div>
                                    <div style={s.personName}>{vic.VictimName}</div>
                                    <div style={s.personMeta}>Age: {vic.AgeYear} · Gender: {vic.GenderID}</div>
                                </div>
                            ))}
                        </div>

                        <div style={s.card('#6B3A2A')}>
                            <div style={s.cardTitle}>Evidence ({fir.evidence_list.length})</div>
                            {fir.evidence_list.map((ev, i) => (
                                <div key={i} style={s.evidenceItem}>
                                    <span style={{ fontSize: '18px' }}>
                                        {ev.type === 'Document' ? '📄' : ev.type === 'Digital' ? '💻' : '🖼️'}
                                    </span>
                                    <div>
                                        <div style={s.evidenceText}>{ev.description}</div>
                                        <div style={s.evidenceType}>{ev.type}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={s.card('#1A3A5C')}>
                            <div style={s.cardTitle}>Witnesses ({fir.witness_list.length})</div>
                            {fir.witness_list.map((wit, i) => (
                                <div key={i} style={s.personCard}>
                                    <div style={s.personName}>{wit.name}</div>
                                    <div style={s.personMeta}>{wit.contact}</div>
                                </div>
                            ))}
                        </div>

                    </div>

                    <div style={s.rightCol}>

                        <div style={s.card('#1A3A5C')}>
                            <div style={s.cardTitle}>Timeline</div>
                            {fir.timeline.map((item, i) => (
                                <div key={i} style={s.timelineItem}>
                                    <div style={s.timelineDot} />
                                    <div>
                                        <div style={s.timelineDate}>{item.date}</div>
                                        <div style={s.timelineEvent}>{item.event}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={s.card('#C0392B')}>
                            <div style={s.cardTitle}>Investigation Status</div>
                            <div style={{ ...s.statusBadge, display: 'block', textAlign: 'center' }}>{fir.status}</div>
                        </div>

                        <div style={s.card('#E8C547')}>
                            <div style={s.cardTitle}>Recommended Next Actions</div>
                            {fir.recommended_actions.map((action, i) => (
                                <div key={i} style={s.actionItem}>
                                    <span style={s.actionBullet}>→</span>
                                    <span>{action}</span>
                                </div>
                            ))}
                        </div>

                        <div style={s.card('#6B3A2A')}>
                            <div style={s.cardTitle}>AI Source Lineage</div>
                            <span style={s.xaiLabel}>Analysis based on:</span>
                            <div style={s.xaiRow}>
                                {fir.source_nodes.map((node, i) => (
                                    <span key={i} style={s.xaiTag}>
                                        {node.CrimeNo || `CASE-${node.CaseMasterID}`}
                                        {node.confidence_score && (
                                            <span style={{ color: '#1A7A4A', fontWeight: '700' }}>
                                                {' '}· {Math.round(node.confidence_score * 100)}%
                                            </span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default FIRDetail;