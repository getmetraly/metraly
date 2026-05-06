import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../../components/shared/Icon';
import { useTweaks } from '../../context/TweaksContext';

const simulateAIResponse = async (userMessage) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const lower = userMessage.toLowerCase();
  if (lower.includes('ci') || lower.includes('build')) {
    return "Synthetic preview: demo CI success rate is 92.4% over the sample 7-day window. The scripted failure category is integration-test timeout.";
  } else if (lower.includes('deploy') || lower.includes('frequency')) {
    return "Synthetic preview: demo deployment frequency averages 4.2 deploys per day in the sample dataset. This is not live production data.";
  } else if (lower.includes('pr') || lower.includes('pull request')) {
    return "Synthetic preview: the sample dataset contains 8 open PRs awaiting review. Average demo PR cycle time is 22 hours.";
  } else if (lower.includes('lead') || lower.includes('time')) {
    return "Synthetic preview: demo lead time for changes is 38 hours at p50. This is scripted sample output, not live inference.";
  }
  return "Synthetic preview: I can answer scripted demo questions about CI, deployments, PRs, DORA, and team velocity using sample metrics only.";
};

const promptSuggestions = [
  'Synthetic CI pass rate?',
  'Demo deployment frequency',
  'Sample PR review time',
  'Demo team velocity',
  'Synthetic DORA metrics',
  'Sample failures',
];

export const AIScreen = () => {
  const { tweaks } = useTweaks();
  const density = tweaks.density;
  const padding = { compact: '16px 20px', comfortable: '24px 28px', spacious: '32px 36px' }[density];
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Synthetic AI preview. Responses in this demo are scripted output based on sample metrics, not live AI inference or real company data.' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.35, marginBottom: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--purple)', opacity: 0.9, flexShrink: 0 }} />
          <span><strong style={{ color: 'var(--purple)', fontWeight: 600 }}>Synthetic AI preview</strong> · scripted responses only · no live AI inference</span>
        </div>

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: m.role === 'assistant' ? 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(180,76,255,0.2))' : 'rgba(255,255,255,0.06)', border: m.role === 'assistant' ? '1px solid rgba(180,76,255,0.3)' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
              {m.role === 'assistant' ? <Icon name="sparkles" size={13} color="var(--purple)" /> : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>JD</span>}
            </div>
            <div style={{ flex: 1, background: m.role === 'assistant' ? 'var(--glass)' : 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 15px', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
              {m.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(180,76,255,0.2))', border: '1px solid rgba(180,76,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="sparkles" size={13} color="var(--purple)" />
            </div>
            <div style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 15px', fontSize: 12.5, color: 'var(--muted2)' }}>
              Generating scripted demo response…
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '8px 28px 12px', borderTop: '1px solid var(--border)', background: 'rgba(11,15,25,0.96)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {promptSuggestions.map(question => (
            <button key={question} onClick={() => setInput(question)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 14, padding: '4px 12px', fontSize: 11, color: 'var(--muted2)', cursor: 'pointer' }}>
              {question}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12, padding: '6px 14px' }}>
          <Icon name="sparkles" size={15} color="var(--purple)" />
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyPress} placeholder="Ask about synthetic demo metrics…" disabled={isLoading} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13.5, fontFamily: 'var(--font-body)', lineHeight: 1.4, padding: '8px 0' }} />
          <button onClick={sendMessage} disabled={isLoading || !input.trim()} style={{ padding: '6px 14px', borderRadius: 8, cursor: isLoading || !input.trim() ? 'default' : 'pointer', background: 'var(--grad)', border: 'none', color: '#fff', fontSize: 12.5, fontWeight: 600, opacity: isLoading || !input.trim() ? 0.6 : 1 }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};