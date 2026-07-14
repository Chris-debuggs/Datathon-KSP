import { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ExportReport from '../components/ExportReport';

// ─── Base URL for Catalyst Advanced I/O ────────────────────────────────────
const BASE_URL = 'http://localhost:3000/server/ksp_datathon_function';

// ─── Mock sidebar conversation history ─────────────────────────────────────
const mockConversationHistory = [
  { id: 1, title: 'UPI Fraud — Case #4421', time: '2h ago' },
  { id: 2, title: 'Vehicle theft Whitefield', time: 'Yesterday' },
  { id: 3, title: 'Cyber scam — Case #3105', time: '3 days ago' },
];

// ─── Get current time ───────────────────────────────────────────────────────
const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// ─── Mock chat API ──────────────────────────────────────────────────────────
// Matches mockApiService.sendChatMessage exactly
// TODO: Replace with real apiFetch() in ticket 4.2
const mockSendChatMessage = async (message, history) => {
  await new Promise(res => setTimeout(res, 1500));
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
const pollJobStatus = (jobId, attempt = 1, onComplete, onError) => {
  if (attempt > 7) {
    onError('Analysis timed out. Please try again.');
    return;
  }
  const delay = 2000 * Math.pow(1.5, attempt - 1);
  setTimeout(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/status/${jobId}`);
      const data = await res.json();
      if (data.status === 'complete') {
        const graphRes = await fetch(data.result_url);
        const graphData = await graphRes.json();
        onComplete(graphData);
      } else {
        pollJobStatus(jobId, attempt + 1, onComplete, onError);
      }
    } catch (err) {
      onError('Polling failed. Please try again.');
    }
  }, delay);
};

// ─── Animated loading dots ──────────────────────────────────────────────────
const LoadingDots = () => {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d === 3 ? 1 : d + 1);
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return (
    <span style={{ letterSpacing: '2px', color: '#C0392B', fontWeight: '700' }}>
      {'●'.repeat(dots)}{'○'.repeat(3 - dots)}
    </span>
  );
};

// ─── Chat Component ─────────────────────────────────────────────────────────
const Chat = () => {
  const [contextHistory, setContextHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [systemBusy, setSystemBusy] = useState(false);
  const [activeConv, setActiveConv] = useState(1);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingMessage, setPollingMessage] = useState('');

  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null); // Ticket 4.1: ref for PDF capture

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contextHistory, streamedText, isLoading, isPolling]);

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

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handleMic = () => {
    setIsRecording(prev => !prev);
  };

  const handleAsyncJob = (jobId) => {
    setIsPolling(true);
    setPollingMessage('Analyzing Criminal Network...');
    pollJobStatus(jobId, 1,
      (graphData) => {
        setIsPolling(false);
        setPollingMessage('');
        console.log('Graph nodes:', graphData.nodes);
        console.log('Graph edges:', graphData.edges);
      },
      (errMsg) => {
        setIsPolling(false);
        setPollingMessage('');
        setSystemBusy(true);
      }
    );
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || isStreaming || isPolling) return;
    const userMessage = inputValue.trim();
    setInputValue('');
    setSystemBusy(false);
    const updatedHistory = [
      ...contextHistory,
      { role: 'user', content: userMessage, timestamp: getTimestamp() },
    ];
    setContextHistory(updatedHistory);
    setIsLoading(true);
    try {
      // TODO: swap with real apiFetch() in ticket 4.2
      const data = await mockSendChatMessage(userMessage, updatedHistory);
      setIsLoading(false);
      if (data.job_id) {
        handleAsyncJob(data.job_id);
        return;
      }
      await streamText(data.response);
      setContextHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          source_nodes: data.source_nodes || [],
          session_id: data.session_id,
          timestamp: getTimestamp(),
        },
      ]);
      setStreamedText('');
    } catch (err) {
      setIsLoading(false);
      if (err?.status === 429 || err?.status === 504) {
        setSystemBusy(true);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getTagLabel = (node) => {
    if (node.CrimeNo) return node.CrimeNo;
    if (node.AccusedMasterID) return `ACC-${node.AccusedMasterID}`;
    if (node.CaseMasterID) return `CASE-${node.CaseMasterID}`;
    return node.id || 'Source';
  };

  const isBusy = isLoading || isStreaming || isPolling;
  const charCount = inputValue.length;
  const charLimit = 500;

  const s = {
    page: { minHeight: '100vh', background: '#F5F0E8', fontFamily: "'Inter', sans-serif" },
    layout: { display: 'flex', height: 'calc(100vh - 61px)' },
    sidebar: { width: '240px', background: '#1A3A5C', padding: '16px', flexShrink: 0, overflowY: 'auto', borderRight: '3px solid #6B3A2A' },
    sidebarLabel: { fontSize: '10px', fontWeight: '700', color: '#E8C547', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', display: 'block' },
    sidebarItem: (active) => ({ padding: '10px 12px', borderRadius: '8px', marginBottom: '6px', cursor: 'pointer', borderLeft: `3px solid ${active ? '#E8C547' : 'transparent'}`, background: active ? 'rgba(232,197,71,0.15)' : 'transparent' }),
    sidebarTitle: { fontSize: '13px', fontWeight: '500', color: '#fff', marginBottom: '2px' },
    sidebarTime: { fontSize: '11px', color: 'rgba(255,255,255,0.4)' },
    sidebarEmpty: { fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '20px', lineHeight: '1.5' },
    newChatBtn: { width: '100%', marginTop: '14px', padding: '10px', background: '#E8C547', color: '#1A3A5C', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
    chatMain: { flex: 1, display: 'flex', flexDirection: 'column', background: '#F5F0E8' },
    exportBar: { padding: '8px 20px', background: '#fff', borderBottom: '1px solid #E2D5C3', display: 'flex', justifyContent: 'flex-end' },
    messages: { flex: 1, padding: '24px', overflowY: 'auto' },
    intro: { background: '#fff', border: '1px solid #E2D5C3', borderLeft: '4px solid #1A3A5C', borderRadius: '10px', padding: '18px 22px', marginBottom: '20px', maxWidth: '680px' },
    introTitle: { fontSize: '13px', fontWeight: '700', color: '#1A3A5C', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    introText: { fontSize: '14px', color: '#4A3728', lineHeight: '1.6' },
    officerMsgWrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: '16px' },
    officerBubble: { background: '#6B3A2A', color: '#fff', borderRadius: '14px 14px 2px 14px', padding: '12px 16px', maxWidth: '480px', fontSize: '14px', lineHeight: '1.5' },
    timestamp: { fontSize: '10px', color: '#A0896B', marginTop: '4px' },
    aiMsgWrap: { maxWidth: '680px', marginBottom: '16px' },
    aiBubble: { background: '#fff', border: '1px solid #E2D5C3', borderLeft: '4px solid #C0392B', borderRadius: '2px 14px 14px 14px', padding: '14px 16px', fontSize: '14px', color: '#1A3A5C', lineHeight: '1.6' },
    aiFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' },
    xaiRow: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' },
    xaiTag: { fontSize: '11px', fontWeight: '600', color: '#1A3A5C', background: '#FEF9E7', border: '1px solid #E8C547', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' },
    xaiConfidence: (score) => ({ fontSize: '10px', color: score >= 0.9 ? '#1A7A4A' : '#C0392B', fontWeight: '600' }),
    xaiLabel: { fontSize: '11px', color: '#A0896B' },
    copyBtn: (copied) => ({ fontSize: '11px', fontWeight: '600', color: copied ? '#1A7A4A' : '#A0896B', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }),
    loadingBubble: { background: '#fff', border: '1px solid #E2D5C3', borderLeft: '4px solid #C0392B', borderRadius: '2px 14px 14px 14px', padding: '14px 16px', fontSize: '14px', color: '#1A3A5C', maxWidth: '680px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' },
    pollingBanner: { background: '#EBF2FA', border: '1px solid #1A3A5C', borderLeft: '4px solid #1A3A5C', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', maxWidth: '680px', fontSize: '13px', color: '#1A3A5C', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' },
    systemBusyBanner: { background: '#FEF3CD', border: '1px solid #E8C547', borderLeft: '4px solid #C0392B', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', maxWidth: '680px', fontSize: '13px', color: '#6B3A2A', fontWeight: '500' },
    inputBar: { background: '#fff', borderTop: '2px solid #E2D5C3', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' },
    inputRow: { display: 'flex', alignItems: 'center', gap: '10px' },
    input: { flex: 1, padding: '10px 14px', border: '1.5px solid #E2D5C3', borderRadius: '8px', fontSize: '14px', color: '#1A3A5C', outline: 'none', background: '#FDFAF6' },
    inputMeta: { display: 'flex', justifyContent: 'flex-end' },
    charCount: (over) => ({ fontSize: '11px', color: over ? '#C0392B' : '#A0896B', fontWeight: over ? '600' : '400' }),
    micBtn: (recording) => ({ width: '40px', height: '40px', borderRadius: '50%', border: `1.5px solid ${recording ? '#C0392B' : '#E2D5C3'}`, background: recording ? '#FDECEA' : '#FDFAF6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', transition: 'all 0.2s' }),
    sendBtn: (disabled) => ({ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: disabled ? '#E2D5C3' : '#C0392B', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '15px', transition: 'background 0.2s' }),
  };

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.layout}>

        {/* Sidebar */}
        <div style={s.sidebar}>
          <span style={s.sidebarLabel}>Recent Conversations</span>
          {mockConversationHistory.length === 0 ? (
            <p style={s.sidebarEmpty}>No previous investigations</p>
          ) : (
            mockConversationHistory.map(item => (
              <div key={item.id} style={s.sidebarItem(item.id === activeConv)} onClick={() => setActiveConv(item.id)}>
                <div style={s.sidebarTitle}>{item.title}</div>
                <div style={s.sidebarTime}>{item.time}</div>
              </div>
            ))
          )}
          <button style={s.newChatBtn} onClick={() => { setContextHistory([]); setSystemBusy(false); setIsPolling(false); setStreamedText(''); }}>
            + New Investigation
          </button>
        </div>

        {/* Chat Main */}
        <div style={s.chatMain}>

          {/* Ticket 4.1: Export button — only shows when messages exist */}
          {contextHistory.length > 0 && (
            <div style={s.exportBar}>
              <ExportReport
                targetRef={messagesAreaRef}
                filename="ASTRA_Investigation_Report"
                label="Export Report"
              />
            </div>
          )}

          <div ref={messagesAreaRef} style={s.messages}>

            {contextHistory.length === 0 && !isLoading && (
              <div style={s.intro}>
                <div style={s.introTitle}>ASTRA Investigation Assistant</div>
                <div style={s.introText}>
                  Good morning, XYZ. How can I assist your investigation today?
                  Ask me about FIRs, suspects, vehicles, UPI transactions, or request a relationship analysis.
                </div>
              </div>
            )}

            {systemBusy && (
              <div style={s.systemBusyBanner}>
                ⚠️ System Busy - Re-routing Intel. Please try again in 30 seconds.
              </div>
            )}

            {contextHistory.map((msg, index) => (
              <div key={index}>
                {msg.role === 'user' ? (
                  <div style={s.officerMsgWrap}>
                    <div style={s.officerBubble}>{msg.content}</div>
                    {msg.timestamp && <span style={s.timestamp}>{msg.timestamp}</span>}
                  </div>
                ) : (
                  <div style={s.aiMsgWrap}>
                    <div style={s.aiBubble}>{msg.content}</div>
                    <div style={s.aiFooter}>
                      {msg.source_nodes && msg.source_nodes.length > 0 ? (
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
                      ) : <div />}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {msg.timestamp && <span style={s.timestamp}>{msg.timestamp}</span>}
                        <button style={s.copyBtn(copiedIndex === index)} onClick={() => handleCopy(msg.content, index)}>
                          {copiedIndex === index ? '✓ Copied' : '⎘ Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={s.loadingBubble}>
                <span style={{ fontSize: '13px', color: '#6B3A2A' }}>ASTRA is thinking</span>
                <LoadingDots />
              </div>
            )}

            {isStreaming && streamedText && (
              <div style={s.aiMsgWrap}>
                <div style={s.aiBubble}>
                  {streamedText}
                  <span style={{ opacity: 0.4 }}>▌</span>
                </div>
              </div>
            )}

            {isPolling && (
              <div style={s.pollingBanner}>
                <span>🔄</span>
                <span>{pollingMessage}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div style={s.inputBar}>
            <div style={s.inputRow}>
              <input
                style={s.input}
                type="text"
                placeholder="Ask about a case, suspect, vehicle, UPI ID..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.slice(0, charLimit))}
                onKeyDown={handleKeyDown}
                disabled={isBusy}
              />
              <button style={s.micBtn(isRecording)} onClick={handleMic} title={isRecording ? 'Stop recording' : 'Start voice input'}>
                {isRecording ? '⏹️' : '🎤'}
              </button>
              <button style={s.sendBtn(isBusy || !inputValue.trim())} onClick={handleSend} disabled={isBusy || !inputValue.trim()}>
                ➤
              </button>
            </div>
            <div style={s.inputMeta}>
              <span style={s.charCount(charCount > charLimit * 0.9)}>{charCount}/{charLimit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;