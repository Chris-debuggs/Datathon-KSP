import { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';

// ─── Base URL for Catalyst Advanced I/O ────────────────────────────────────
const BASE_URL = 'http://localhost:3000/server/ksp_datathon_function';

// ─── Mock sidebar conversation history ─────────────────────────────────────
const mockConversationHistory = [
  { id: 1, title: 'UPI Fraud — Case #4421', time: '2h ago' },
  { id: 2, title: 'Vehicle theft Whitefield', time: 'Yesterday' },
  { id: 3, title: 'Cyber scam — Case #3105', time: '3 days ago' },
];

// ─── Mock chat API ──────────────────────────────────────────────────────────
// Matches mockApiService.sendChatMessage exactly
// TODO: Replace with real fetch() to POST /api/chat when Chris confirms endpoint
// Request:  { message: string, history: contextHistory[] }
// Response: { success, session_id, response, source_nodes, job_id? }
const mockSendChatMessage = async (message, history) => {
  await new Promise(res => setTimeout(res, 1500));

  // Uncomment to test HTTP 429 system busy:
  // throw { status: 429 };

  // Uncomment to test async graph polling (ticket 2.6):
  // return { job_id: 'job_traversal_8834_ksp', status: 202 };

  return {
    success: true,
    session_id: 'sess_98234_ksp',
    response: `Based on your query about "${message}", I found matching cyber fraud incidents. In Case 104430006202600001, registered at Unit 43, an accused individual named Ramesh Kumar (Age: 48) is under active investigation.`,
    source_nodes: [
      {
        CaseMasterID: 892341,
        CrimeNo: '104430006202600001',
        entity_type: 'Accused',
        AccusedMasterID: 5543,
        confidence_score: 0.98,
      },
    ],
  };
};

// ─── Ticket 2.6: Exponential Backoff Polling ───────────────────────────────
// Exactly per Chris's starter code:
// Base 2s × 1.5^(attempt-1), max 7 attempts
// Polls GET /api/v1/jobs/:jobId/status
// On complete → fetches Stratus JSON from result_url → triggers D3 render
const pollJobStatus = (jobId, attempt = 1, onComplete, onError) => {
  if (attempt > 7) {
    onError('Analysis timed out. Please try again.');
    return;
  }

  // delay per attempt:
  // attempt 1 → 2000ms
  // attempt 2 → 3000ms
  // attempt 3 → 4500ms
  // attempt 4 → 6750ms
  // attempt 5 → 10125ms
  // attempt 6 → 15187ms
  // attempt 7 → 22781ms
  const delay = 2000 * Math.pow(1.5, attempt - 1);

  setTimeout(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/status/${jobId}`);
      const data = await res.json();

      if (data.status === 'complete') {
        // Fetch Stratus JSON from result_url → pass to D3 graph (ticket 3.4)
        const graphRes = await fetch(data.result_url);
        const graphData = await graphRes.json();
        onComplete(graphData);
      } else {
        // Still running → next attempt
        pollJobStatus(jobId, attempt + 1, onComplete, onError);
      }
    } catch (err) {
      onError('Polling failed. Please try again.');
    }
  }, delay);
};

// ─── Chat Component ─────────────────────────────────────────────────────────
const Chat = () => {

  // Ticket 2.4: conversation state as array of message objects
  // Each message: { role: 'user'|'assistant', content, source_nodes?, session_id? }
  const [contextHistory, setContextHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [systemBusy, setSystemBusy] = useState(false);
  const [activeConv, setActiveConv] = useState(1);

  // Ticket 2.6: async graph polling states
  const [isPolling, setIsPolling] = useState(false);
  const [pollingMessage, setPollingMessage] = useState('');

  const messagesEndRef = useRef(null);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contextHistory, streamedText, isLoading, isPolling]);

  // ─── Stream AI response word by word ─────────────────────────────────────
  const streamText = async (fullText) => {
    setIsStreaming(true);
    setStreamedText('');
    const words = fullText.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise(res => setTimeout(res, 60));
      setStreamedText(prev => prev + (i === 0 ? '' : ' ') + words[i]);
    }
    setIsStreaming(false);
    return fullText;
  };

  // ─── Ticket 2.6: Start polling after async graph job triggered ────────────
  const handleAsyncJob = (jobId) => {
    setIsPolling(true);
    setPollingMessage('Analyzing Criminal Network...');

    pollJobStatus(
      jobId,
      1,
      // onComplete: Stratus JSON fetched → pass nodes+edges to D3 (ticket 3.4)
      (graphData) => {
        setIsPolling(false);
        setPollingMessage('');
        // TODO ticket 3.4: pass graphData.nodes and graphData.edges to D3
        console.log('Graph nodes:', graphData.nodes);
        console.log('Graph edges:', graphData.edges);
      },
      // onError: polling timed out or failed
      (errMsg) => {
        setIsPolling(false);
        setPollingMessage('');
        setSystemBusy(true);
      }
    );
  };

  // ─── Ticket 2.4: Send message handler ────────────────────────────────────
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || isStreaming || isPolling) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setSystemBusy(false);

    // Append user message to context_history array
    const updatedHistory = [
      ...contextHistory,
      { role: 'user', content: userMessage },
    ];
    setContextHistory(updatedHistory);
    setIsLoading(true);

    try {
      // Ticket 2.4: POST /api/chat with message + full context_history
      // TODO: swap with real fetch() when Chris confirms /api/chat endpoint:
      // const res = await fetch(`${BASE_URL}/api/chat`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     message: userMessage,
      //     history: updatedHistory,
      //   })
      // });
      // if (res.status === 429 || res.status === 504) throw { status: res.status };
      // const data = await res.json();
      const data = await mockSendChatMessage(userMessage, updatedHistory);

      setIsLoading(false);

      // Ticket 2.6: if response has job_id → async graph job was triggered
      if (data.job_id) {
        handleAsyncJob(data.job_id);
        return;
      }

      // Normal response → stream word by word
      // Note: field is "response" per mockApiService.js (not "message"!)
      await streamText(data.response);

      // Append AI response to context_history with source_nodes
      setContextHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          source_nodes: data.source_nodes || [],
          session_id: data.session_id,
        },
      ]);
      setStreamedText('');

    } catch (err) {
      setIsLoading(false);
      // Ticket 4.2: catch HTTP 429 (rate limit) and 504 (timeout)
      if (err?.status === 429 || err?.status === 504) {
        setSystemBusy(true);
      }
    }
  };

  // Enter key sends message (Shift+Enter = new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Format XAI source tag label ─────────────────────────────────────────
  // Matches source_nodes structure from mockApiService.js
  const getTagLabel = (node) => {
    if (node.CrimeNo) return node.CrimeNo;
    if (node.AccusedMasterID) return `ACC-${node.AccusedMasterID}`;
    if (node.CaseMasterID) return `CASE-${node.CaseMasterID}`;
    return node.id || 'Source';
  };

  const isBusy = isLoading || isStreaming || isPolling;

  // ─── Styles ───────────────────────────────────────────────────────────────
  const s = {
    page: {
      minHeight: '100vh',
      background: '#F5F0E8',
      fontFamily: "'Inter', sans-serif",
    },
    layout: {
      display: 'flex',
      height: 'calc(100vh - 61px)',
    },

    // Sidebar
    sidebar: {
      width: '240px',
      background: '#1A3A5C',
      padding: '16px',
      flexShrink: 0,
      overflowY: 'auto',
      borderRight: '3px solid #6B3A2A',
    },
    sidebarLabel: {
      fontSize: '10px', fontWeight: '700',
      color: '#E8C547', textTransform: 'uppercase',
      letterSpacing: '1px', marginBottom: '12px',
      display: 'block',
    },
    sidebarItem: (active) => ({
      padding: '10px 12px', borderRadius: '8px',
      marginBottom: '6px', cursor: 'pointer',
      borderLeft: `3px solid ${active ? '#E8C547' : 'transparent'}`,
      background: active ? 'rgba(232,197,71,0.15)' : 'transparent',
    }),
    sidebarTitle: {
      fontSize: '13px', fontWeight: '500',
      color: '#fff', marginBottom: '2px',
    },
    sidebarTime: {
      fontSize: '11px', color: 'rgba(255,255,255,0.4)',
    },
    newChatBtn: {
      width: '100%', marginTop: '14px', padding: '10px',
      background: '#E8C547', color: '#1A3A5C',
      border: 'none', borderRadius: '8px',
      fontSize: '13px', fontWeight: '700', cursor: 'pointer',
    },

    // Main chat area
    chatMain: {
      flex: 1, display: 'flex',
      flexDirection: 'column', background: '#F5F0E8',
    },
    messages: {
      flex: 1, padding: '24px', overflowY: 'auto',
    },

    // Intro box
    intro: {
      background: '#fff',
      border: '1px solid #E2D5C3',
      borderLeft: '4px solid #1A3A5C',
      borderRadius: '10px',
      padding: '18px 22px',
      marginBottom: '20px',
      maxWidth: '680px',
    },
    introTitle: {
      fontSize: '13px', fontWeight: '700',
      color: '#1A3A5C', marginBottom: '6px',
      textTransform: 'uppercase', letterSpacing: '0.5px',
    },
    introText: {
      fontSize: '14px', color: '#4A3728', lineHeight: '1.6',
    },

    // Officer message
    officerMsg: {
      display: 'flex', justifyContent: 'flex-end', marginBottom: '16px',
    },
    officerBubble: {
      background: '#6B3A2A', color: '#fff',
      borderRadius: '14px 14px 2px 14px',
      padding: '12px 16px', maxWidth: '480px',
      fontSize: '14px', lineHeight: '1.5',
    },

    // AI message
    aiMsg: {
      maxWidth: '680px', marginBottom: '16px',
    },
    aiBubble: {
      background: '#fff',
      border: '1px solid #E2D5C3',
      borderLeft: '4px solid #C0392B',
      borderRadius: '2px 14px 14px 14px',
      padding: '14px 16px',
      fontSize: '14px', color: '#1A3A5C', lineHeight: '1.6',
    },

    // XAI source tags
    xaiRow: {
      display: 'flex', gap: '6px',
      marginTop: '8px', flexWrap: 'wrap', alignItems: 'center',
    },
    xaiTag: {
      fontSize: '11px', fontWeight: '600',
      color: '#1A3A5C', background: '#FEF9E7',
      border: '1px solid #E8C547',
      borderRadius: '4px', padding: '2px 8px', cursor: 'pointer',
    },
    xaiConfidence: (score) => ({
      fontSize: '10px',
      color: score >= 0.9 ? '#1A7A4A' : '#C0392B',
      fontWeight: '600',
    }),
    xaiLabel: {
      fontSize: '11px', color: '#A0896B',
    },

    // Loading bubble
    loadingBubble: {
      background: '#fff',
      border: '1px solid #E2D5C3',
      borderLeft: '4px solid #C0392B',
      borderRadius: '2px 14px 14px 14px',
      padding: '14px 16px',
      fontSize: '14px', color: '#94A3B8',
      maxWidth: '680px', marginBottom: '16px',
      display: 'flex', alignItems: 'center', gap: '8px',
    },

    // Ticket 2.6: polling banner
    pollingBanner: {
      background: '#EBF2FA',
      border: '1px solid #1A3A5C',
      borderLeft: '4px solid #1A3A5C',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
      maxWidth: '680px',
      fontSize: '13px', color: '#1A3A5C', fontWeight: '600',
      display: 'flex', alignItems: 'center', gap: '10px',
    },

    // Ticket 4.2: system busy banner
    systemBusyBanner: {
      background: '#FEF3CD',
      border: '1px solid #E8C547',
      borderLeft: '4px solid #C0392B',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
      maxWidth: '680px',
      fontSize: '13px', color: '#6B3A2A', fontWeight: '500',
    },

    // Input bar
    inputBar: {
      background: '#fff',
      borderTop: '2px solid #E2D5C3',
      padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: '10px',
    },
    input: {
      flex: 1, padding: '10px 14px',
      border: '1.5px solid #E2D5C3',
      borderRadius: '8px', fontSize: '14px',
      color: '#1A3A5C', outline: 'none', background: '#FDFAF6',
    },
    micBtn: {
      width: '40px', height: '40px', borderRadius: '50%',
      border: '1.5px solid #E2D5C3', background: '#FDFAF6',
      cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: '17px',
    },
    sendBtn: (disabled) => ({
      width: '40px', height: '40px', borderRadius: '50%',
      border: 'none',
      background: disabled ? '#E2D5C3' : '#C0392B',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#fff', fontSize: '15px',
    }),
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <Navbar />

      <div style={s.layout}>

        {/* ── Sidebar ── */}
        <div style={s.sidebar}>
          <span style={s.sidebarLabel}>Recent Conversations</span>
          {mockConversationHistory.map(item => (
            <div
              key={item.id}
              style={s.sidebarItem(item.id === activeConv)}
              onClick={() => setActiveConv(item.id)}
            >
              <div style={s.sidebarTitle}>{item.title}</div>
              <div style={s.sidebarTime}>{item.time}</div>
            </div>
          ))}
          <button
            style={s.newChatBtn}
            onClick={() => {
              setContextHistory([]);
              setSystemBusy(false);
              setIsPolling(false);
              setStreamedText('');
            }}
          >
            + New Investigation
          </button>
        </div>

        {/* ── Chat Main ── */}
        <div style={s.chatMain}>
          <div style={s.messages}>

            {/* Intro — only when no messages yet */}
            {contextHistory.length === 0 && !isLoading && (
              <div style={s.intro}>
                <div style={s.introTitle}>
                  ASTRA Investigation Assistant
                </div>
                <div style={s.introText}>
                  Good morning, XYZ. How can I assist your investigation today?
                  Ask me about FIRs, suspects, vehicles, UPI transactions,
                  or request a relationship analysis.
                </div>
              </div>
            )}

            {/* Ticket 4.2: System Busy Banner */}
            {systemBusy && (
              <div style={s.systemBusyBanner}>
                ⚠️ System Busy — Re-routing Intel. Please try again in 30 seconds.
              </div>
            )}

            {/* Ticket 2.4: Render context_history messages */}
            {contextHistory.map((msg, index) => (
              <div key={index}>
                {msg.role === 'user' ? (

                  // Officer message bubble
                  <div style={s.officerMsg}>
                    <div style={s.officerBubble}>
                      {msg.content}
                    </div>
                  </div>

                ) : (

                  // AI message bubble with XAI source tags
                  <div style={s.aiMsg}>
                    <div style={s.aiBubble}>
                      {msg.content}
                    </div>

                    {/* XAI source_nodes — matches mockApiService.js structure */}
                    {msg.source_nodes && msg.source_nodes.length > 0 && (
                      <div style={s.xaiRow}>
                        {msg.source_nodes.map((node, i) => (
                          <span key={i} style={s.xaiTag}>
                            {getTagLabel(node)}
                            {node.confidence_score && (
                              <span style={s.xaiConfidence(node.confidence_score)}>
                                {' '}·{' '}{Math.round(node.confidence_score * 100)}%
                              </span>
                            )}
                          </span>
                        ))}
                        <span style={s.xaiLabel}>· Sources</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Loading state — "ASTRA is thinking..." */}
            {isLoading && (
              <div style={s.loadingBubble}>
                <span>ASTRA is thinking</span>
                <span>•••</span>
              </div>
            )}

            {/* Streaming text — word by word with cursor */}
            {isStreaming && streamedText && (
              <div style={s.aiMsg}>
                <div style={s.aiBubble}>
                  {streamedText}
                  <span style={{ opacity: 0.4 }}>▌</span>
                </div>
              </div>
            )}

            {/* Ticket 2.6: Polling banner */}
            {isPolling && (
              <div style={s.pollingBanner}>
                <span>🔄</span>
                <span>{pollingMessage}</span>
              </div>
            )}

            {/* Auto scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Bar ── */}
          <div style={s.inputBar}>
            <input
              style={s.input}
              type="text"
              placeholder="Ask about a case, suspect, vehicle, UPI ID..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isBusy}
            />
            <button style={s.micBtn}>🎤</button>
            <button
              style={s.sendBtn(isBusy || !inputValue.trim())}
              onClick={handleSend}
              disabled={isBusy || !inputValue.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;