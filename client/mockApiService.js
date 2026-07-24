/**
 * PROJECT ASTRA - FRONTEND MOCK API
 * 
 * Instructions for Dev 1:
 * Import these functions into your React/Vue components. 
 * They simulate the Catalyst Advanced I/O backend with realistic network delays.
 * Build your state management and UI around these exact response structures.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockApiService = {
  // 1. FIR Search (Simulates Ticket 2.1)
  searchFIRs: async (query) => {
    console.log(`[MOCK API] Searching FIRs for: ${query}`);
    await delay(800); // Simulate ZCQL lookup latency
    return {
      success: true,
      execution_time_ms: 142,
      data: [
        {
          CaseMasterID: 892341,
          CrimeNo: "104430006202600001",
          CaseNo: "202600001",
          CrimeRegisteredDate: "2026-06-15T09:30:00Z",
          PoliceStationID: 43,
          BriefFacts: "Suspect transferred funds via unauthorized UPI access.",
          latitude: 12.971598,
          longitude: 77.594562,
          status: "Under Investigation",
          accused_list: [
            {
              AccusedMasterID: 5543,
              AccusedName: "Ramesh Kumar",
              AgeYear: 48,
              GenderID: 1,
              PersonID: "A1"
            }
          ],
          complainant_list: [
            {
              ComplainantID: 1029,
              ComplainantName: "Suresh Rao",
              AgeYear: 35
            }
          ]
        }
      ]
    };
  },

  // 2. Chat Agent (Simulates Ticket 3.1 & 3.2)
  sendChatMessage: async (message, history) => {
    console.log(`[MOCK API] Sending to QuickML: ${message}`);
    await delay(1500); // Simulate LLM reasoning latency
    return {
      success: true,
      session_id: "sess_98234_ksp",
      response: "Found matching cyber fraud incidents. In Case 104430006202600001, registered at Unit 43, an accused individual named Ramesh Kumar (Age: 48) is under active investigation.",
      source_nodes: [
        {
          CaseMasterID: 892341,
          CrimeNo: "104430006202600001",
          entity_type: "Accused",
          AccusedMasterID: 5543,
          confidence_score: 0.98
        }
      ],
      latency_ms: 1205
    };
  },

  // 3. Trigger Graph Job (Simulates Ticket 2.5 - Catalyst Job Function)
  triggerGraphTraversal: async (seedNodeId) => {
    console.log(`[MOCK API] Triggering Async Job for Node: ${seedNodeId}`);
    await delay(300); // Instant API Gateway response
    return {
      status: "processing",
      job_id: "job_traversal_8834_ksp",
      poll_interval_ms: 2000,
      status_url: "/api/status/job_traversal_8834_ksp"
    };
  },

  // 4. Poll Job Status (Simulates Ticket 2.6 - Exponential Backoff)
  // Dev 1: Call this in a loop until status === 'complete'
  pollJobStatus: async (jobId, attemptCounter) => {
    console.log(`[MOCK API] Polling Job ${jobId}, Attempt: ${attemptCounter}`);
    await delay(500);
    
    // Simulate it taking 3 attempts to finish the Catalyst Job
    if (attemptCounter < 3) {
      return {
        job_id: jobId,
        status: "running",
        result: null
      };
    }

    return {
      job_id: jobId,
      status: "complete",
      result: {
        nodes: [
          {
            id: "ACC_5543",
            label: "Ramesh Kumar",
            type: "Accused",
            metadata: { AgeYear: 48, PersonID: "A1" }
          },
          {
            id: "CASE_892341",
            label: "FIR: 104430006202600001",
            type: "CaseMaster",
            metadata: { status: "Under Investigation" }
          }
        ],
        edges: [
          {
            edge_id: 994231,
            source: "ACC_5543",
            target: "CASE_892341",
            relationship: "ACCUSED_IN",
            weight: 1.0
          }
        ]
      }
    };
  },

  // 5. Analytics Dashboard (Simulates Ticket 3.3)
  getAnalytics: async () => {
    console.log(`[MOCK API] Fetching Aggregated ZCQL Analytics`);
    await delay(900);
    return {
      success: true,
      timestamp: new Date().toISOString(),
      crime_head_distribution: [
        { CrimeMajorHeadID: 12, crime_group_name: "Cyber Crime", case_count: 4821 },
        { CrimeMajorHeadID: 4, crime_group_name: "Property Theft", case_count: 3104 }
      ],
      gravity_metrics: [
        { GravityOffenceID: 1, classification: "Heinous", active_count: 942 },
        { GravityOffenceID: 2, classification: "Non-Heinous", active_count: 6983 }
      ],
      resolution_rates: {
        total_chargesheets_filed: 5832,
        report_types: {
          A_chargesheet: 4100,
          B_false_case: 832,
          C_undetected: 900
        }
      }
    };
  }
};
