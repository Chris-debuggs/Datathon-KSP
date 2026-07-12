import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import Navbar from '../components/Navbar';

// ─── Base URL ───────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:3000/server/ksp_datathon_function';

// ─── Mock graph data (matches mockApiService.pollJobStatus exactly) ─────────
const mockGraphData = {
    nodes: [
        { id: 'ACC_5543', label: 'Ramesh Kumar', type: 'Accused', metadata: { AgeYear: 48, PersonID: 'A1', GenderID: 'M' } },
        { id: 'ACC_5544', label: 'Suresh Rao', type: 'Accused', metadata: { AgeYear: 35, PersonID: 'A2', GenderID: 'M' } },
        { id: 'ACC_5545', label: 'Priya Nair', type: 'Accused', metadata: { AgeYear: 29, PersonID: 'A3', GenderID: 'F' } },
        { id: 'VIC_1001', label: 'Anand Krishnan', type: 'Victim', metadata: { AgeYear: 52, GenderID: 'M' } },
        { id: 'VIC_1002', label: 'Meena Pillai', type: 'Victim', metadata: { AgeYear: 44, GenderID: 'F' } },
        { id: 'CASE_8921', label: 'FIR: 104430006202600001', type: 'CaseMaster', metadata: { status: 'Under Investigation', CrimeNo: '104430006202600001' } },
        { id: 'CASE_8922', label: 'FIR: 104430006202600002', type: 'CaseMaster', metadata: { status: 'Charge Sheeted', CrimeNo: '104430006202600002' } },
        { id: 'CASE_8923', label: 'FIR: 104430006202600003', type: 'CaseMaster', metadata: { status: 'Under Investigation', CrimeNo: '104430006202600003' } },
    ],
    edges: [
        { edge_id: 1, source: 'ACC_5543', target: 'CASE_8921', relationship: 'ACCUSED_IN', weight: 1.0 },
        { edge_id: 2, source: 'ACC_5543', target: 'CASE_8922', relationship: 'ACCUSED_IN', weight: 1.0 },
        { edge_id: 3, source: 'ACC_5544', target: 'CASE_8922', relationship: 'ACCUSED_IN', weight: 1.0 },
        { edge_id: 4, source: 'ACC_5544', target: 'CASE_8923', relationship: 'ACCUSED_IN', weight: 1.0 },
        { edge_id: 5, source: 'ACC_5545', target: 'CASE_8921', relationship: 'ACCUSED_IN', weight: 1.0 },
        { edge_id: 6, source: 'VIC_1001', target: 'CASE_8921', relationship: 'VICTIM_IN', weight: 0.8 },
        { edge_id: 7, source: 'VIC_1002', target: 'CASE_8923', relationship: 'VICTIM_IN', weight: 0.8 },
    ],
};

// ─── Node visual config ──────────────────────────────────────────────────────
// Ticket 3.4: Cases = blue squares, Accused = red circles
const NODE_CONFIG = {
    CaseMaster: { color: '#1A3A5C', hoverColor: '#1A3A5C', shape: 'square', size: 20, labelColor: '#fff' },
    Accused: { color: '#C0392B', hoverColor: '#A93226', shape: 'circle', size: 16, labelColor: '#fff' },
    Victim: { color: '#E8C547', hoverColor: '#D4B040', shape: 'circle', size: 14, labelColor: '#1A3A5C' },
    default: { color: '#6B3A2A', hoverColor: '#5A3022', shape: 'circle', size: 13, labelColor: '#fff' },
};

const getConfig = (type) => NODE_CONFIG[type] || NODE_CONFIG.default;

// ─── Truncate label cleanly ──────────────────────────────────────────────────
const truncate = (str, max = 16) =>
    str.length > max ? str.substring(0, max) + '…' : str;

// ─── Graph Component ─────────────────────────────────────────────────────────
const Graph = ({ graphData = null }) => {
    const svgRef = useRef(null);
    const simRef = useRef(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredId, setHoveredId] = useState(null);

    const data = graphData || mockGraphData;

    // ─── Build D3 graph ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!data?.nodes?.length) return;

        const container = svgRef.current;
        const width = container.clientWidth || 900;
        const height = container.clientHeight || 580;

        const svg = d3.select(container);
        svg.selectAll('*').remove();

        // ── Defs: arrowhead marker ──────────────────────────────────────────────
        const defs = svg.append('defs');
        defs.append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -4 8 8')
            .attr('refX', 28)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-4L8,0L0,4')
            .attr('fill', '#C8B89A');

        // ── Zoom container ──────────────────────────────────────────────────────
        const g = svg.append('g');
        svg.call(
            d3.zoom()
                .scaleExtent([0.15, 4])
                .on('zoom', (e) => g.attr('transform', e.transform))
        );

        // Deep clone for D3
        const nodes = data.nodes.map(n => ({ ...n }));
        const edges = data.edges.map(e => ({ ...e }));

        // ── Force simulation ────────────────────────────────────────────────────
        // Optimized for 100+ nodes without crashing
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(edges).id(d => d.id).distance(d => {
                // Cases further apart, accused closer to their cases
                const sType = d.source.type || '';
                const tType = d.target.type || '';
                if (sType === 'CaseMaster' || tType === 'CaseMaster') return 140;
                return 100;
            }).strength(0.6))
            .force('charge', d3.forceManyBody().strength(-380).distanceMax(450))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => getConfig(d.type).size + 28).strength(0.9))
            .force('x', d3.forceX(width / 2).strength(0.03))
            .force('y', d3.forceY(height / 2).strength(0.03))
            .alphaDecay(0.028)
            .velocityDecay(0.4);

        simRef.current = simulation;

        // ── Edge lines ──────────────────────────────────────────────────────────
        const linkGroup = g.append('g').attr('class', 'links');
        const link = linkGroup.selectAll('line')
            .data(edges)
            .join('line')
            .attr('stroke', '#D4C4AE')
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.7)
            .attr('marker-end', 'url(#arrow)');

        // ── Edge labels ─────────────────────────────────────────────────────────
        const edgeLabelGroup = g.append('g').attr('class', 'edge-labels');
        const edgeLabel = edgeLabelGroup.selectAll('text')
            .data(edges)
            .join('text')
            .attr('font-size', '9px')
            .attr('font-weight', '500')
            .attr('fill', '#A0896B')
            .attr('text-anchor', 'middle')
            .attr('pointer-events', 'none')
            .text(d => d.relationship);

        // ── Node groups ─────────────────────────────────────────────────────────
        const nodeGroup = g.append('g').attr('class', 'nodes');
        const node = nodeGroup.selectAll('g')
            .data(nodes)
            .join('g')
            .attr('cursor', 'pointer')
            .call(
                d3.drag()
                    .on('start', (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on('drag', (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on('end', (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null;
                        d.fy = null;
                    })
            );

        // ── Draw shape per node type ────────────────────────────────────────────
        node.each(function (d) {
            const config = getConfig(d.type);
            const el = d3.select(this);
            const s = config.size;

            if (config.shape === 'square') {
                // CaseMaster → rounded blue square
                el.append('rect')
                    .attr('width', s * 2.2)
                    .attr('height', s * 2.2)
                    .attr('x', -(s * 1.1))
                    .attr('y', -(s * 1.1))
                    .attr('rx', 5)
                    .attr('ry', 5)
                    .attr('fill', config.color)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 2.5)
                    .attr('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))');
            } else {
                // Accused/Victim → circle
                el.append('circle')
                    .attr('r', s)
                    .attr('fill', config.color)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 2.5)
                    .attr('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))');
            }

            // ── Node label INSIDE shape ─────────────────────────────────────────
            // Short ID label inside (PersonID for accused, FIR# short for cases)
            const insideLabel =
                d.metadata?.PersonID
                    ? d.metadata.PersonID
                    : d.type === 'CaseMaster'
                        ? '📁'
                        : '👤';

            el.append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .attr('font-size', config.shape === 'square' ? '11px' : '10px')
                .attr('font-weight', '700')
                .attr('fill', config.labelColor)
                .attr('pointer-events', 'none')
                .text(insideLabel);

            // ── Name label BELOW shape ──────────────────────────────────────────
            // Prevents overlap — fixed offset below node
            const labelOffset = config.shape === 'square' ? s * 1.1 + 14 : s + 14;

            // White background pill for label readability
            const labelText = truncate(d.label);
            const charWidth = 6.5;
            const labelW = labelText.length * charWidth + 12;

            el.append('rect')
                .attr('x', -(labelW / 2))
                .attr('y', labelOffset - 11)
                .attr('width', labelW)
                .attr('height', 15)
                .attr('rx', 4)
                .attr('fill', 'rgba(255,255,255,0.88)')
                .attr('pointer-events', 'none');

            el.append('text')
                .attr('text-anchor', 'middle')
                .attr('y', labelOffset)
                .attr('font-size', '10.5px')
                .attr('font-weight', '600')
                .attr('fill', '#1A3A5C')
                .attr('pointer-events', 'none')
                .text(labelText)
                .append('title')
                .text(d.label); // full label on hover tooltip
        });

        // ── Hover highlight ─────────────────────────────────────────────────────
        node
            .on('mouseover', function (event, d) {
                const config = getConfig(d.type);
                d3.select(this).select('circle, rect')
                    .attr('stroke', '#E8C547')
                    .attr('stroke-width', 3.5);

                // Highlight connected edges
                link
                    .attr('stroke', e =>
                        e.source.id === d.id || e.target.id === d.id
                            ? '#C0392B' : '#D4C4AE'
                    )
                    .attr('stroke-width', e =>
                        e.source.id === d.id || e.target.id === d.id ? 2.5 : 1.5
                    )
                    .attr('stroke-opacity', e =>
                        e.source.id === d.id || e.target.id === d.id ? 1 : 0.3
                    );
            })
            .on('mouseout', function (event, d) {
                d3.select(this).select('circle, rect')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 2.5);

                link
                    .attr('stroke', '#D4C4AE')
                    .attr('stroke-width', 1.5)
                    .attr('stroke-opacity', 0.7);
            })
            .on('click', (event, d) => {
                event.stopPropagation();
                setSelectedNode(d);

                // Highlight selected node's edges
                link
                    .attr('stroke', e =>
                        e.source.id === d.id || e.target.id === d.id
                            ? '#C0392B' : '#D4C4AE'
                    )
                    .attr('stroke-width', e =>
                        e.source.id === d.id || e.target.id === d.id ? 2.5 : 1.5
                    );
            });

        // Click canvas to deselect
        svg.on('click', () => {
            setSelectedNode(null);
            link.attr('stroke', '#D4C4AE').attr('stroke-width', 1.5);
        });

        // ── Tick update ─────────────────────────────────────────────────────────
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            edgeLabel
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2 - 4);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        return () => simulation.stop();

    }, [data]);

    // ─── Styles ───────────────────────────────────────────────────────────────
    const s = {
        page: {
            minHeight: '100vh',
            background: '#F5F0E8',
            fontFamily: "'Inter', sans-serif",
        },
        wrap: {
            padding: '20px 24px',
            height: 'calc(100vh - 61px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        title: {
            fontSize: '18px', fontWeight: '800', color: '#1A3A5C',
        },
        sub: {
            fontSize: '13px', color: '#6B3A2A', fontWeight: '500',
        },
        nodeCount: {
            fontSize: '12px', color: '#A0896B',
            background: '#fff', padding: '5px 12px',
            borderRadius: '20px', border: '1px solid #E2D5C3',
        },
        searchBar: {
            background: '#fff',
            border: '1.5px solid #E2D5C3',
            borderLeft: '4px solid #C0392B',
            borderRadius: '8px',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: '10px',
        },
        searchInput: {
            flex: 1, border: 'none', outline: 'none',
            fontSize: '13px', color: '#1A3A5C', background: 'transparent',
        },
        mainArea: {
            flex: 1,
            display: 'flex',
            gap: '16px',
            minHeight: 0,
        },
        graphCanvas: {
            flex: 1,
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #E2D5C3',
            overflow: 'hidden',
            position: 'relative',
        },
        legend: {
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(255,255,255,0.96)',
            border: '1px solid #E2D5C3',
            borderRadius: '10px',
            padding: '12px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        },
        legendTitle: {
            fontSize: '10px', fontWeight: '700',
            color: '#6B3A2A', textTransform: 'uppercase',
            letterSpacing: '0.8px', marginBottom: '10px',
        },
        legendItem: {
            display: 'flex', alignItems: 'center',
            gap: '8px', marginBottom: '6px',
        },
        legendSquare: {
            width: '14px', height: '14px',
            background: '#1A3A5C', borderRadius: '3px',
            flexShrink: 0,
        },
        legendCircleRed: {
            width: '14px', height: '14px',
            background: '#C0392B', borderRadius: '50%',
            flexShrink: 0,
        },
        legendCircleYellow: {
            width: '14px', height: '14px',
            background: '#E8C547', borderRadius: '50%',
            flexShrink: 0,
        },
        legendLabel: {
            fontSize: '11px', color: '#1A3A5C', fontWeight: '500',
        },
        zoomHint: {
            position: 'absolute',
            top: '12px',
            right: '12px',
            fontSize: '10px', color: '#A0896B',
            background: 'rgba(255,255,255,0.9)',
            padding: '4px 10px', borderRadius: '6px',
            border: '1px solid #E2D5C3',
        },
        detailPanel: {
            width: '260px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #E2D5C3',
            borderTop: '3px solid #1A3A5C',
            padding: '18px',
            overflowY: 'auto',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
        },
        detailEmpty: {
            flex: 1,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column', gap: '10px',
        },
        detailEmptyIcon: {
            fontSize: '32px',
        },
        detailEmptyText: {
            fontSize: '12px', color: '#A0896B',
            textAlign: 'center', lineHeight: '1.5',
        },
        typeBadge: (type) => ({
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '10px', fontWeight: '700',
            letterSpacing: '0.5px',
            background:
                type === 'CaseMaster' ? '#EBF2FA' :
                    type === 'Accused' ? '#FDECEA' :
                        type === 'Victim' ? '#FEF9E7' : '#F5F0E8',
            color:
                type === 'CaseMaster' ? '#1A3A5C' :
                    type === 'Accused' ? '#C0392B' :
                        type === 'Victim' ? '#6B3A2A' : '#6B3A2A',
            marginBottom: '10px',
        }),
        detailName: {
            fontSize: '14px', fontWeight: '700',
            color: '#1A3A5C', marginBottom: '4px',
            lineHeight: '1.4',
        },
        detailId: {
            fontSize: '11px', color: '#A0896B',
            marginBottom: '14px',
        },
        divider: {
            borderTop: '1px solid #F0E8DC',
            margin: '12px 0',
        },
        metaLabel: {
            fontSize: '10px', fontWeight: '600',
            color: '#6B3A2A', textTransform: 'uppercase',
            letterSpacing: '0.5px', marginBottom: '8px',
        },
        metaRow: {
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '8px',
        },
        metaKey: {
            fontSize: '12px', color: '#A0896B',
        },
        metaVal: {
            fontSize: '12px', color: '#1A3A5C', fontWeight: '600',
        },
        viewBtn: {
            width: '100%', padding: '10px',
            background: '#1A3A5C', color: '#fff',
            border: 'none', borderRadius: '8px',
            fontSize: '12px', fontWeight: '700',
            cursor: 'pointer', marginTop: '12px',
        },
        closeBtn: {
            width: '100%', padding: '9px',
            background: '#F5F0E8', color: '#6B3A2A',
            border: '1px solid #E2D5C3', borderRadius: '8px',
            fontSize: '12px', fontWeight: '600',
            cursor: 'pointer', marginTop: '6px',
        },
    };

    return (
        <div style={s.page}>
            <Navbar />

            <div style={s.wrap}>

                {/* Header */}
                <div style={s.header}>
                    <div>
                        <h1 style={s.title}>Relationship Graph</h1>
                        <p style={s.sub}>Karnataka State Police — Criminal Network Analysis</p>
                    </div>
                    <span style={s.nodeCount}>
                        {data.nodes.length} nodes · {data.edges.length} connections
                    </span>
                </div>

                {/* Search */}
                <div style={s.searchBar}>
                    <span style={{ fontSize: '16px' }}>🔍</span>
                    <input
                        style={s.searchInput}
                        type="text"
                        placeholder="Search entity by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Main */}
                <div style={s.mainArea}>

                    {/* Graph Canvas */}
                    <div style={s.graphCanvas}>
                        <svg
                            ref={svgRef}
                            width="100%"
                            height="100%"
                            style={{ display: 'block' }}
                        />

                        {/* Zoom hint */}
                        <div style={s.zoomHint}>
                            Scroll to zoom · Drag to pan · Click node for details
                        </div>

                        {/* Legend */}
                        <div style={s.legend}>
                            <div style={s.legendTitle}>Node Types</div>
                            <div style={s.legendItem}>
                                <div style={s.legendSquare} />
                                <span style={s.legendLabel}>Case (FIR)</span>
                            </div>
                            <div style={s.legendItem}>
                                <div style={s.legendCircleRed} />
                                <span style={s.legendLabel}>Accused</span>
                            </div>
                            <div style={s.legendItem}>
                                <div style={s.legendCircleYellow} />
                                <span style={s.legendLabel}>Victim</span>
                            </div>
                        </div>
                    </div>

                    {/* Detail Panel */}
                    <div style={s.detailPanel}>
                        {!selectedNode ? (
                            <div style={s.detailEmpty}>
                                <span style={s.detailEmptyIcon}>🔍</span>
                                <p style={s.detailEmptyText}>
                                    Click any node on the graph to view entity details
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div style={s.typeBadge(selectedNode.type)}>
                                    {selectedNode.type.toUpperCase()}
                                </div>
                                <div style={s.detailName}>{selectedNode.label}</div>
                                <div style={s.detailId}>ID: {selectedNode.id}</div>

                                <div style={s.divider} />

                                <div style={s.metaLabel}>Details</div>
                                {selectedNode.metadata &&
                                    Object.entries(selectedNode.metadata).map(([key, val]) => (
                                        <div key={key} style={s.metaRow}>
                                            <span style={s.metaKey}>{key}</span>
                                            <span style={s.metaVal}>{String(val)}</span>
                                        </div>
                                    ))
                                }

                                <div style={s.divider} />

                                {selectedNode.type === 'CaseMaster' && (
                                    <button style={s.viewBtn}>View Full FIR</button>
                                )}
                                <button
                                    style={s.closeBtn}
                                    onClick={() => setSelectedNode(null)}
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Graph;