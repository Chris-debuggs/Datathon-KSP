'use strict';

const express = require('express');
const catalyst = require('zcatalyst-sdk-node');

const app = express();

app.use(express.json());

// ── Catalyst URL Rewrite Middleware ──
// Catalyst Cloud API Gateway passes the full function path to Express. 
// We strip it here so our simple '/api/...' routes match correctly.
app.use((req, res, next) => {
    if (req.url.startsWith('/server/ksp_datathon_function')) {
        req.url = req.url.replace('/server/ksp_datathon_function', '');
    }
    next();
});

// Ticket 2.1: Base FIR Retrieval API
app.get('/api/fir/search', async (req, res) => {
    try {
        const crimeNo = req.query.crime_no;
        if (!crimeNo) {
            return res.status(400).json({ status: "error", message: "crime_no parameter is required." });
        }

        // Initialize Catalyst SDK
        const catalystApp = catalyst.initialize(req);
        
        // Construct ZCQL query. Ensure we fetch from CaseMaster.
        // We limit to 50 as per API gateway best practices to prevent timeouts.
        const zcql = catalystApp.zcql();
        const query = `SELECT * FROM CaseMaster WHERE CrimeNo = '${crimeNo}' LIMIT 50`;
        
        const zcqlPromise = zcql.executeZCQLQuery(query);
        const result = await zcqlPromise;

        // Serialize ResultSet to match JSON API contract
        // ZCQL returns an array of objects where table name is the key: [{ CaseMaster: { CrimeNo: ... } }]
        const serializedData = result.map(row => row.CaseMaster);

        return res.status(200).json({
            status: "success",
            data: serializedData
        });
        
    } catch (err) {
        console.error("Error executing FIR search:", err);
        return res.status(500).json({ status: "error", message: "Internal server error during FIR lookup." });
    }
});

const crypto = require('crypto');

app.post('/api/graph', async (req, res) => {
    const catalystApp = catalyst.initialize(req, res);
    const jobId = 'job_' + crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    
    const payload = {
        job_id: jobId,
        seed_node_id: req.body.seed_node_id || "5543"
    };

    try {
        // Trigger the Job Function asynchronously
        const functionContext = catalystApp.functions();
        
        // Execute the job without awaiting its completion
        functionContext.execute('graph_worker_job', { job_payload: JSON.stringify(payload) })
            .catch(err => console.error("Worker trigger failed", err));

        // Return HTTP 202 instantly so the API Gateway doesn't timeout
        res.status(202).json({
            status: "processing",
            job_id: jobId,
            poll_interval_ms: 2000,
            status_url: `/api/status/${jobId}`
        });
    } catch (error) {
        console.error("Graph trigger error", error);
        res.status(500).json({ success: false, error: "Failed to trigger traversal" });
    }
});

// Ticket 2.6: Graph Status Polling API
// Reads the result payload that graph_worker_job writes into Catalyst Cache
app.get('/api/status/:jobId', async (req, res) => {
    try {
        let catalystApp = catalyst.initialize(req);
        const segment = catalystApp.cache().segment();
        const result = await segment.getValue(req.params.jobId);
        
        if (result) {
            res.json({ status: 'complete', result: JSON.parse(result) });
        } else {
            res.json({ status: 'processing' });
        }
    } catch (err) {
        // Cache misses might throw an error instead of returning null depending on SDK version
        res.json({ status: 'processing' });
    }
});
// ==========================================
// TECH LEAD BACKUP: AUTOMATED CSV SEEDER
// ==========================================
const fs = require('fs');
const path = require('path');

app.post('/api/seed', async (req, res) => {
    const catalystApp = catalyst.initialize(req, res);
    const datastore = catalystApp.datastore();
    
    // Helper to parse CSV without external libraries
    function parseCSV(fileName) {
        // Traverse up out of the .build/functions/ksp_datathon_function folder to the root dataset_csvs folder
        const filePath = path.join(__dirname, '../../../dataset_csvs', fileName);
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            return [];
        }
        
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const results = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if(values.length === headers.length) {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index].trim();
                });
                results.push(obj);
            }
        }
        return results;
    }

    // Helper to push data in safe batches of 50
    async function insertInBatches(tableName, data) {
        const BATCH_SIZE = 50; 
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            try {
                await datastore.table(tableName).insertRows(batch);
                console.log(`Inserted ${i + batch.length}/${data.length} into ${tableName}`);
            } catch (err) {
                console.error(`Batch insert failed for ${tableName}`, err.toString());
            }
        }
    }

    try {
        console.log("Starting automated Data Store seeding...");
        
        // 1. Read the local CSVs
        const cases = parseCSV('case_master.csv');
        const accused = parseCSV('accused.csv');
        const arrests = parseCSV('arrest_surrender.csv');
        const chargesheets = parseCSV('chargesheets.csv');
        const edges = parseCSV('zcql_edges.csv');

        // 2. Push to Catalyst Data Store
        if (cases.length > 0) await insertInBatches('CaseMaster', cases);
        if (accused.length > 0) await insertInBatches('Accused', accused);
        if (arrests.length > 0) await insertInBatches('ArrestSurrender', arrests);
        if (chargesheets.length > 0) await insertInBatches('ChargesheetDetails', chargesheets);
        if (edges.length > 0) await insertInBatches('ZCQL_Edges', edges);

        res.status(200).json({ success: true, message: "Database Seeding Complete!" });
    } catch (error) {
        console.error("Seeding error", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// AUTHENTICATION API
// ==========================================
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;

  // Standard email format validation (allows any valid email domain)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Please enter a valid email address.' 
    });
  }

  // Derive display username or fallback role
  const username = email.split('@')[0];
  
  return res.json({
    status: 'success',
    data: {
      email,
      username,
      role: 'Investigator',
      token: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
      timestamp: Date.now()
    }
  });
});

// ==========================================
// REAL-TIME ANALYTICS API
// ==========================================
app.get('/api/analytics', async (req, res) => {
    try {
        const catalystApp = catalyst.initialize(req);
        const zcql = catalystApp.zcql();

        // Fire all aggregation queries concurrently
        const [statusRes, crimeTypeRes, unitRes, arrestRes, chargesheetRes] = await Promise.all([
            zcql.executeZCQLQuery("SELECT Status, COUNT(ROWID) FROM CaseMaster GROUP BY Status"),
            zcql.executeZCQLQuery("SELECT Crime_Type, COUNT(ROWID) FROM CaseMaster GROUP BY Crime_Type"),
            zcql.executeZCQLQuery("SELECT UnitID, COUNT(ROWID) FROM CaseMaster GROUP BY UnitID"),
            zcql.executeZCQLQuery("SELECT COUNT(ROWID) FROM ArrestSurrender"),
            zcql.executeZCQLQuery("SELECT COUNT(ROWID) FROM ChargesheetDetails")
        ]);

        // Process results
        let totalCases = 0;
        const statusBreakdown = statusRes.map(row => {
            const count = parseInt(row.CaseMaster.COUNT) || 0;
            totalCases += count;
            return { status: row.CaseMaster.Status || 'Unknown', count };
        });

        const crimeTypes = crimeTypeRes.map(row => ({
            label: row.CaseMaster.Crime_Type || 'Unknown',
            value: parseInt(row.CaseMaster.COUNT) || 0
        }));

        const unitWorkload = unitRes.map(row => ({
            unit: row.CaseMaster.UnitID || 'Unknown',
            count: parseInt(row.CaseMaster.COUNT) || 0
        }));

        const arrestCount = parseInt(arrestRes[0]?.ArrestSurrender?.COUNT || arrestRes[0]?.COUNT) || 0;
        const chargesheetCount = parseInt(chargesheetRes[0]?.ChargesheetDetails?.COUNT || chargesheetRes[0]?.COUNT) || 0;

        return res.status(200).json({
            status: "success",
            data: {
                totalCases,
                crimeTypes,
                statusBreakdown,
                unitWorkload,
                arrestCount,
                chargesheetCount
            }
        });

    } catch (err) {
        console.error("Analytics Error:", err);
        return res.status(500).json({ status: "error", message: "Failed to fetch analytics data." });
    }
});

// Catch-all route
app.all('*', (req, res) => {
    res.status(404).json({ status: "error", message: "Route not found in Advanced I/O function." });
});

module.exports = app;
