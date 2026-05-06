import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../../components/shared/Icon';

// Scripted demo response. This public demo does not call a live AI model.
const simulateAIResponse = async (userMessage) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  const lower = userMessage.toLowerCase();
  if (lower.includes('ci') || lower.includes('build')) {
    return "Synthetic demo result: CI success rate is 92.4% over the last 7 demo days, which is 2.1% above the scripted rolling average. The simulated failure pattern is integration-test timeouts.";
  } else if (lower.includes('deploy') || lower.includes('frequency')) {
    return "Synthetic demo result: deployment frequency averages 4.2 deploys per day. The scripted demo trend is up 8% from the previous demo period.";
  } else if (lower.includes('pr') || lower.includes('pull request')) {
    return "Synthetic demo result: 8 demo PRs are awaiting review. The scripted average PR cycle time is 22 hours, slightly above the sample team target of 18 hours.";
  } else if (lower.includes('lead') || lower.includes('time')) {
    return "Synthetic demo result: lead time for changes is 38 hours p50 in the sample data. Backend is shortest at 22h and frontend is longest at 52h.";
  } else {
    return "This is a scripted synthetic AI preview. Try asking about demo CI, deployments, PRs, DORA, or team velocity.";
  }
};

export const AIScreen = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Synthetic AI preview. Responses in this demo are scripted output based on sample metrics, not live AI inference or real company data." },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);
    try {
      const reply = await simulateAIResponse(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Scripted demo response unavailable. Please try another sample question." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ margin: '16px 28px 0', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(0,229,255,0.18)', background: 'rgba(0,229,255,0.06)', color: 'var(--muted2)', fontSize: 12.5, lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--cyan)' }}>Synthetic AI preview.</strong> Scripted demo output only. Do not enter real company data, repository names, secrets, prompts, credentials, tokens, or personal information.
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              animation: 'fade-up 0.3s ease both',
              animationDelay: `${i * 0.05}s`,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                flexShrink: 0,
                background: m.role === 'assistant'
                  ? 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(180,76,255,0.2))'
                  : 'rgba(255,255,255,0.06)',
                border: m.role === 'assistant' ? '1px solid rgba(180,76,255,0.3)' : '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              {m.role === 'assistant'
                ? <Icon name="sparkles" size={13} color="var(--purple)" />
                : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>JD</span>
              }
            </div>
            <div
              style={{
                flex: 1,
                background: m.role === 'assistant' ? 'var(--glass)' : 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '12px 15px',
                fontSize: 13.5,
                color: 'var(--text)',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                borderTopLeftRadius: m.role === 'assistant' ? 3 : 12,
                borderTopRightRadius: m.role === 'user' ? 3 : 12,
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(180,76,255,0.2))',
                border: '1px solid rgba(180,76,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="sparkles" size={13} color="var(--purple)" />
            </div>
            <div
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '12px 15px',
              }}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', animation: 'pulse-dot 1s infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', animation: 'pulse-dot 1s infinite 0.2s' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', animation: 'pulse-dot 1s infinite 0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
    <div style={{ padding: '14px 28px', borderTop: '1px solid var(--border)', background: 'rgba(11,15,25,0.7)' }}>
    <div
        style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: 'var(--glass)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '6px 14px',
        }}
    >
        <div style={{ position: 'relative', flexShrink: 0 }}>
        <Icon name="sparkles" size={15} color="var(--purple)" />
        <div
            style={{
            position: 'absolute',
            top: -3,
            right: -3,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--cyan)',
            border: '1.5px solid var(--bg)',
            animation: 'pulse-dot 2s infinite',
            }}
        />
        </div>
        <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Ask about synthetic demo metrics…"
        disabled={isLoading}
        style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: 13.5,
            fontFamily: 'var(--font-body)',
            lineHeight: 1.4,
            padding: '8px 0',
        }}
        />
        <button
        onClick={sendMessage}
        disabled={isLoading || !input.trim()}
        style={{
            padding: '6px 14px',
            borderRadius: 8,
            cursor: isLoading || !input.trim() ? 'default' : 'pointer',
            background: 'var(--grad)',
            border: 'none',
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 600,
            opacity: isLoading || !input.trim() ? 0.6 : 1,
            transition: 'opacity 0.15s',
        }}
        >
        Send
        </button>
    </div>

    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['CI pass rate?', 'Deployment frequency', 'PR review time', 'Team velocity', 'DORA metrics', 'Recent failures'].map(question => (
        <button
            key={question}
            onClick={() => setInput(question)}
            style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '4px 12px',
            fontSize: 11,
            color: 'var(--muted2)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.1)'; e.currentTarget.style.color = 'var(--cyan)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--muted2)'; }}
        >
            {question}
        </button>
        ))}
    </div>

    <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
        Scripted synthetic preview · No live AI call in this demo
    </div>
    </div>
    </div>
  );
};