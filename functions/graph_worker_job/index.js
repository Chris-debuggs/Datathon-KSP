'use strict';

// ══════════════════════════════════════════════════════════════════════
// AUDIT FIX 3.3: graph_worker_job — Catalyst Job Function
// ══════════════════════════════════════════════════════════════════════
// Performs BFS traversal of the ZCQL_Edges table to build criminal
// network graphs. Triggered programmatically by ksp_datathon_function's
// POST /api/graph endpoint. Has a 15-minute timeout (vs 30s for
// Advanced I/O), making it safe for large graph traversals.
//
// Input payload: { job_id, seed_node_id }
// Output: Writes JSON { nodes, edges } to Catalyst Cache or logs it
// for retrieval by GET /api/status/:jobId
// ══════════════════════════════════════════════════════════════════════

const catalyst = require('zcatalyst-sdk-node');

module.exports = async (cronDetails, context) => {
	console.log('[GRAPH_WORKER] Job triggered at:', new Date().toISOString());

	try {
		// ── Parse the trigger payload ──────────────────────────────────
		const rawPayload = cronDetails.getArguments
			? cronDetails.getArguments()
			: (cronDetails.arguments || cronDetails);

		let payload;
		if (typeof rawPayload === 'string') {
			payload = JSON.parse(rawPayload);
		} else if (rawPayload.job_payload) {
			payload = JSON.parse(rawPayload.job_payload);
		} else {
			payload = rawPayload;
		}

		const jobId = payload.job_id;
		const seedNodeId = payload.seed_node_id || payload.seedNodeId || null;

		console.log(`[GRAPH_WORKER] Job ID: ${jobId}, Seed Node: ${seedNodeId}`);

		if (!jobId) {
			console.error('[GRAPH_WORKER] Missing job_id in payload');
			context.close();
			return;
		}

		// ── Initialize Catalyst SDK ───────────────────────────────────
		const catalystApp = catalyst.initialize(context);
		const zcql = catalystApp.zcql();

		// ── BFS Graph Traversal ───────────────────────────────────────
		// Max 3 hops to prevent runaway queries on 110K+ edge records
		const MAX_HOPS = 3;
		const MAX_NODES = 150;
		const visited = new Set();
		const graphNodes = [];
		const graphEdges = [];
		const queue = [];

		// Determine starting point
		if (seedNodeId) {
			queue.push({ id: seedNodeId, hop: 0 });
			visited.add(seedNodeId);
		} else {
			// No seed — grab a sample CaseMaster to start from
			console.log('[GRAPH_WORKER] No seed_node_id provided, sampling a random case');
			const sampleQuery = 'SELECT CaseMasterID FROM CaseMaster LIMIT 1';
			const sampleResult = await zcql.executeZCQLQuery(sampleQuery);
			if (sampleResult && sampleResult.length > 0) {
				const sampleId = sampleResult[0].CaseMaster?.CaseMasterID || sampleResult[0].CaseMasterID;
				if (sampleId) {
					queue.push({ id: sampleId, hop: 0 });
					visited.add(sampleId);
				}
			}
		}

		if (queue.length === 0) {
			console.warn('[GRAPH_WORKER] No starting node found. Writing empty graph.');
			await writeResult(catalystApp, jobId, { nodes: [], edges: [] });
			context.close();
			return;
		}

		// ── BFS Loop ──────────────────────────────────────────────────
		console.log('[GRAPH_WORKER] Starting BFS traversal...');

		while (queue.length > 0 && graphNodes.length < MAX_NODES) {
			const { id: currentId, hop } = queue.shift();

			// Add current node to graph
			graphNodes.push({
				id: currentId,
				hop: hop,
				type: 'entity' // Will be enriched below
			});

			if (hop >= MAX_HOPS) continue;

			// Query outgoing edges: current → target
			const sanitizedId = currentId.replace(/[^a-zA-Z0-9\-]/g, '');
			const outQuery = `SELECT ROWID, SourceID, TargetID, RelationshipType FROM ZCQL_Edges WHERE SourceID = '${sanitizedId}' LIMIT 50`;

			try {
				const outEdges = await zcql.executeZCQLQuery(outQuery);

				for (const row of (outEdges || [])) {
					const edge = row.ZCQL_Edges || row;
					const targetId = edge.TargetID;
					const relType = edge.RelationshipType || 'LINKED_TO';

					if (!targetId) continue;

					graphEdges.push({
						source: sanitizedId,
						target: targetId,
						relationship: relType
					});

					if (!visited.has(targetId) && graphNodes.length < MAX_NODES) {
						visited.add(targetId);
						queue.push({ id: targetId, hop: hop + 1 });
					}
				}
			} catch (queryErr) {
				console.warn(`[GRAPH_WORKER] Edge query failed for ${sanitizedId}:`, queryErr.message);
			}

			// Also query incoming edges: source → current
			const inQuery = `SELECT ROWID, SourceID, TargetID, RelationshipType FROM ZCQL_Edges WHERE TargetID = '${sanitizedId}' LIMIT 50`;

			try {
				const inEdges = await zcql.executeZCQLQuery(inQuery);

				for (const row of (inEdges || [])) {
					const edge = row.ZCQL_Edges || row;
					const sourceId = edge.SourceID;
					const relType = edge.RelationshipType || 'LINKED_TO';

					if (!sourceId) continue;

					graphEdges.push({
						source: sourceId,
						target: sanitizedId,
						relationship: relType
					});

					if (!visited.has(sourceId) && graphNodes.length < MAX_NODES) {
						visited.add(sourceId);
						queue.push({ id: sourceId, hop: hop + 1 });
					}
				}
			} catch (queryErr) {
				console.warn(`[GRAPH_WORKER] Reverse edge query failed for ${sanitizedId}:`, queryErr.message);
			}
		}

		// ── Enrich node types based on edge relationships ─────────────
		const nodeTypeMap = {};
		for (const edge of graphEdges) {
			if (edge.relationship === 'INVOLVED_IN') {
				nodeTypeMap[edge.source] = 'accused';
				nodeTypeMap[edge.target] = 'case';
			} else if (edge.relationship === 'REGISTERED_AT') {
				nodeTypeMap[edge.source] = 'case';
				nodeTypeMap[edge.target] = 'unit';
			} else if (edge.relationship === 'ARRESTED_PERSON') {
				nodeTypeMap[edge.source] = 'arrest';
				nodeTypeMap[edge.target] = 'accused';
			}
		}

		for (const node of graphNodes) {
			if (nodeTypeMap[node.id]) {
				node.type = nodeTypeMap[node.id];
			}
		}

		// ── Write result ──────────────────────────────────────────────
		const result = {
			job_id: jobId,
			status: 'complete',
			node_count: graphNodes.length,
			edge_count: graphEdges.length,
			nodes: graphNodes,
			edges: graphEdges
		};

		console.log(`[GRAPH_WORKER] Traversal complete: ${graphNodes.length} nodes, ${graphEdges.length} edges`);

		await writeResult(catalystApp, jobId, result);

		console.log('[GRAPH_WORKER] Job finished successfully');
	} catch (err) {
		console.error('[GRAPH_WORKER] Fatal error:', err);
	}

	context.close();
};

// ── Write result to Catalyst Cache (key-value store) ──────────────────
// Using Cache instead of Stratus for simplicity in v1.
// The /api/status/:jobId endpoint reads from this same cache.
async function writeResult(catalystApp, jobId, data) {
	try {
		const cache = catalystApp.cache();
		const segment = cache.segment('graph_results');
		await segment.put(jobId, JSON.stringify(data), 3600); // TTL: 1 hour
		console.log(`[GRAPH_WORKER] Result cached under key: ${jobId}`);
	} catch (cacheErr) {
		// Fallback: If Cache is not provisioned, log the result
		// The status endpoint will return mock data
		console.warn('[GRAPH_WORKER] Cache write failed (segment may not exist):', cacheErr.message);
		console.log('[GRAPH_WORKER] Result payload (logged as fallback):');
		console.log(JSON.stringify(data).substring(0, 2000));
	}
}
