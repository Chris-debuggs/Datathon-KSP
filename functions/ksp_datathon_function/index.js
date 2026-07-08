'use strict';

const express = require('express');
const catalyst = require('zcatalyst-sdk-node');

const app = express();

app.use(express.json());

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

// Catch-all route
app.all('*', (req, res) => {
    res.status(404).json({ status: "error", message: "Route not found in Advanced I/O function." });
});

module.exports = app;
