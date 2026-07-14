import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ExportReport from '../components/ExportReport';
import { useRef } from 'react';

// ─── Base URL (used when real API is connected) ─────────────────────────────
// const BASE_URL = 'http://localhost:3000/server/ksp_datathon_function';

// ─── Mock FIR Data ──────────────────────────────────────────────────────────
// Matches CaseMaster + Accused + Victim tables from ER diagram
// TODO: Replace with real apiFetch() to GET /api/fir/{id}
const mockFIRData = {
    CaseMasterID: 892341,
    CrimeNo: '104430006202600001',
    CaseNo: '202600001',
    CrimeRegisteredDate: '2026-06-15T09:30:00Z',
    BriefFacts: 'Suspect transferred funds via unauthorized UPI access. Victim reported unauthorized debit of Rs. 45,000 from their account linked to UPI ID. Investigation reveals a pattern of similar transactions across multiple victims in Bangalore Urban district.',
    status: 'Under Investigation',
    district: 'Bangalore Urban',
    policeStation: 'Whitefield PS',
    latitude: 12.971598,
    longitude: 77.594562,
    accused_list: [
        { AccusedMasterID: 5543, AccusedName: 'Ramesh Kumar', AgeYear: 48, GenderID: 'M', PersonID: 'A1' },
        { AccusedMasterID: 5544, AccusedName: 'Suresh Rao', AgeYear: 35, GenderID: 'M', PersonID: 'A2' },
    ],
    victim_list: [
        { VictimMasterID: 1001, VictimName: 'Anand Krishnan', AgeYear: 52, GenderID: 'M' },
    ],
    witness_list: [
        { name: 'Mohan Das', contact: 'Available at PS' },
    ],
    evidence_list: [
        { type: 'Document', description: 'Bank transaction records' },
        { type: 'Digital', description: 'UPI transaction logs' },
        { type: 'Document', description: 'Victim statement' },
    ],
    timeline: [
        { date: '15 Jun 2026', event: 'FIR Registered at Whitefield PS' },
        { date: '16 Jun 2026', event: 'Investigation officer assigned' },
        { date: '18 Jun 2026', event: 'Bank records obtained' },
        { date: '22 Jun 2026', event: 'Accused identified' },
    ],
    recommended_actions: [
        'Obtain call detail records for accused phone numbers',
        'Freeze bank accounts linked to UPI ID',
        'Issue lookout notice for primary accused',
        'Coordinate with cyber crime cell',
    ],
    source_nodes: [
        { CrimeNo: '104430006202600001', entity_type: 'CaseMaster', confidence_score: 0.98 },
    ],
};

// ─── Status badge color ──────────────────────────────────────────────────────
const getStatusColor = (status) => {
    if (status === 'Under Investigation') return { bg: '#FEF3CD', color: '#6B3A2A', border: '#E8C547' };
    if (status === 'Charge Sheeted') return { bg: '#FDECEA', color: '#C0392B', border: '#C0392B' };
    if (status === 'Closed') return { bg: '#E8F5E9', color: '#1A7A4A', border: '#1A7A4A' };
    return { bg: '#EBF2FA', color: '#1A3A5C', border: '#1A3A5C' };
};

// ─── FIR Detail Component ────────────────────────────────────────────────────
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
                // TODO: replace with real apiFetch when Chris confirms endpoint:
                // const data = await apiFetch(`${BASE_URL}/api/fir/${id}`);
                // setFir(data);
                await new Promise(res => setTimeout(res, 800));
                setFir(mockFIRData);
            } catch (err) {
                console.error('Failed to load FIR:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadFIR();
    }, [id]);

    const statusColors = fir ? getStatusColor(fir.status) : {};

    const s = {
        page: {
            minHeight: '100vh',
            background: '#F5F0E8',
            fontFamily: "'Inter', sans-serif",
        },
        wrap: {
            padding: '24px 28px',
            maxWidth: '1100px',
            margin: '0 auto',
        },

        // Header
        header: {
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '24px',
            gap: '16px',
        },
        backBtn: {
            background: 'none', border: 'none',
            color: '#6B3A2A', fontSize: '13px',
            fontWeight: '600', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            gap: '6px', marginBottom: '8px',
            padding: 0,
        },
        firNumber: {
            fontSize: '20px', fontWeight: '800',
            color: '#1A3A5C', marginBottom: '4px',
        },
        firMeta: {
            fontSize: '13px', color: '#6B3A2A',
            fontWeight: '500',
        },
        statusBadge: {
            display: 'inline-block',
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '12px', fontWeight: '700',
            background: statusColors.bg,
            color: statusColors.color,
            border: `1px solid ${statusColors.border}`,
            marginTop: '8px',
        },
        actionBtns: {
            display: 'flex', gap: '10px', flexShrink: 0,
        },
        graphBtn: {
            padding: '9px 16px',
            background: '#6B3A2A', color: '#fff',
            border: 'none', borderRadius: '8px',
            fontSize: '13px', fontWeight: '600',
            cursor: 'pointer',
        },

        // Grid layout
        grid: {
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: '16px',
        },
        leftCol: { display: 'flex', flexDirection: 'column', gap: '16px' },
        rightCol: { display: 'flex', flexDirection: 'column', gap: '16px' },

        // Cards
        card: (borderColor = '#1A3A5C') => ({
            background: '#fff',
            borderRadius: '10px',
            border: '1px solid #E2D5C3',
            borderTop: `3px solid ${borderColor}`,
            padding: '20px',
        }),
        cardTitle: {
            fontSize: '12px', fontWeight: '700',
            color: '#6B3A2A', textTransform: 'uppercase',
            letterSpacing: '0.8px', marginBottom: '14px',
        },
        cardText: {
            fontSize: '14px', color: '#1A3A5C',
            lineHeight: '1.7',
        },

        // Accused/Victim cards
        personCard: {
            background: '#F5F0E8',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '10px',
            border: '1px solid #E2D5C3',
        },
        personName: {
            fontSize: '14px', fontWeight: '700',
            color: '#1A3A5C', marginBottom: '4px',
        },
        personMeta: {
            fontSize: '12px', color: '#6B3A2A',
        },
        personBadge: (type) => ({
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px', fontWeight: '700',
            background: type === 'Accused' ? '#FDECEA' : '#EBF2FA',
            color: type === 'Accused' ? '#C0392B' : '#1A3A5C',
            marginBottom: '6px',
        }),

        // Timeline
        timelineItem: {
            display: 'flex', gap: '12px',
            marginBottom: '14px', alignItems: 'flex-start',
        },
        timelineDot: {
            width: '10px', height: '10px',
            borderRadius: '50%', background: '#1A3A5C',
            flexShrink: 0, marginTop: '4px',
        },
        timelineDate: {
            fontSize: '11px', color: '#A0896B',
            fontWeight: '600', marginBottom: '2px',
        },
        timelineEvent: {
            fontSize: '13px', color: '#1A3A5C',
        },

        // Evidence
        evidenceItem: {
            display: 'flex', gap: '10px',
            alignItems: 'center', marginBottom: '10px',
            padding: '10px 12px',
            background: '#F5F0E8',
            borderRadius: '8px',
            border: '1px solid #E2D5C3',
        },
        evidenceIcon: { fontSize: '18px' },
        evidenceText: {
            fontSize: '13px', color: '#1A3A5C', fontWeight: '500',
        },
        evidenceType: {
            fontSize: '10px', color: '#A0896B',
        },

        // Recommended actions
        actionItem: {
            display: 'flex', gap: '10px',
            alignItems: 'flex-start',
            marginBottom: '10px',
            fontSize: '13px', color: '#1A3A5C',
            lineHeight: '1.5',
        },
        actionBullet: {
            color: '#C0392B', fontWeight: '700',
            flexShrink: 0, fontSize: '16px',
        },

        // XAI tags
        xaiRow: {
            display: 'flex', gap: '6px',
            flexWrap: 'wrap', marginTop: '8px',
        },
        xaiTag: {
            fontSize: '11px', fontWeight: '600',
            color: '#1A3A5C', background: '#FEF9E7',
            border: '1px solid #E8C547',
            borderRadius: '4px', padding: '2px 8px',
        },
        xaiLabel: {
            fontSize: '11px', color: '#A0896B',
            marginBottom: '6px', display: 'block',
        },

        // Loading
        loading: {
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', height: '60vh',
            fontSize: '14px', color: '#A0896B',
        },
    };

    if (isLoading) {
        return (
            <div style={s.page}>
                <Navbar />
                <div style={s.loading}>Loading FIR details...</div>
            </div>
        );
    }

    if (!fir) {
        return (
            <div style={s.page}>
                <Navbar />
                <div style={s.loading}>FIR not found.</div>
            </div>
        );
    }

    return (
        <div style={s.page}>
            <Navbar />

            <div style={s.wrap} ref={reportRef}>

                {/* Header */}
                <div style={s.header}>
                    <div>
                        <button style={s.backBtn} onClick={() => navigate(-1)}>
                            ← Back
                        </button>
                        <div style={s.firNumber}>FIR: {fir.CrimeNo}</div>
                        <div style={s.firMeta}>
                            {fir.policeStation} · {fir.district} ·{' '}
                            {new Date(fir.CrimeRegisteredDate).toLocaleDateString('en-IN')}
                        </div>
                        <div style={s.statusBadge}>{fir.status}</div>
                    </div>

                    {/* Action buttons */}
                    <div style={s.actionBtns}>
                        <button
                            style={s.graphBtn}
                            onClick={() => navigate('/graph')}
                        >
                            🕸️ View Graph
                        </button>
                        <ExportReport
                            targetRef={reportRef}
                            filename={`FIR_${fir.CrimeNo}`}
                            label="Export PDF"
                        />
                    </div>
                </div>

                {/* Main Grid */}
                <div style={s.grid}>

                    {/* Left Column */}
                    <div style={s.leftCol}>

                        {/* Incident Overview — FR-003 */}
                        <div style={s.card('#1A3A5C')}>
                            <div style={s.cardTitle}>Incident Overview</div>
                            <div style={s.cardText}>{fir.BriefFacts}</div>
                        </div>

                        {/* Accused — FR-003 */}
                        <div style={s.card('#C0392B')}>
                            <div style={s.cardTitle}>Accused ({fir.accused_list.length})</div>
                            {fir.accused_list.map((acc, i) => (
                                <div key={i} style={s.personCard}>
                                    <div style={s.personBadge('Accused')}>ACCUSED</div>
                                    <div style={s.personName}>{acc.AccusedName}</div>
                                    <div style={s.personMeta}>
                                        {acc.PersonID} · Age: {acc.AgeYear} · Gender: {acc.GenderID}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Victims — FR-003 */}
                        <div style={s.card('#E8C547')}>
                            <div style={s.cardTitle}>Victims ({fir.victim_list.length})</div>
                            {fir.victim_list.map((vic, i) => (
                                <div key={i} style={s.personCard}>
                                    <div style={s.personBadge('Victim')}>VICTIM</div>
                                    <div style={s.personName}>{vic.VictimName}</div>
                                    <div style={s.personMeta}>
                                        Age: {vic.AgeYear} · Gender: {vic.GenderID}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Evidence — FR-003 */}
                        <div style={s.card('#6B3A2A')}>
                            <div style={s.cardTitle}>Evidence ({fir.evidence_list.length})</div>
                            {fir.evidence_list.map((ev, i) => (
                                <div key={i} style={s.evidenceItem}>
                                    <span style={s.evidenceIcon}>
                                        {ev.type === 'Document' ? '📄' : ev.type === 'Digital' ? '💻' : '🖼️'}
                                    </span>
                                    <div>
                                        <div style={s.evidenceText}>{ev.description}</div>
                                        <div style={s.evidenceType}>{ev.type}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Witnesses — FR-003 */}
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

                    {/* Right Column */}
                    <div style={s.rightCol}>

                        {/* Timeline — FR-003 */}
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

                        {/* Investigation Status — FR-003 */}
                        <div style={s.card('#C0392B')}>
                            <div style={s.cardTitle}>Investigation Status</div>
                            <div style={{ ...s.statusBadge, display: 'block', textAlign: 'center' }}>
                                {fir.status}
                            </div>
                        </div>

                        {/* Recommended Actions — FR-003 */}
                        <div style={s.card('#E8C547')}>
                            <div style={s.cardTitle}>Recommended Next Actions</div>
                            {fir.recommended_actions.map((action, i) => (
                                <div key={i} style={s.actionItem}>
                                    <span style={s.actionBullet}>→</span>
                                    <span>{action}</span>
                                </div>
                            ))}
                        </div>

                        {/* XAI Source Lineage — FR-008 */}
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