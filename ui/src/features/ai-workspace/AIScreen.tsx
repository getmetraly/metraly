import React, { useState } from 'react';
import { AIWorkspaceLayout } from '../../design-system';
import type { ChatMessage, EvidenceCitation } from '../../design-system';

interface AIReply {
  text: string;
  evidence?: EvidenceCitation[];
}

const QUICK_PROMPTS = [
  'CI pass rate?',
  'Deployment frequency',
  'PR review time',
  'Lead time for changes',
  'Recent failures',
];

async function simulateAIResponse(userMessage: string): Promise<AIReply> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const lower = userMessage.toLowerCase();

  if (lower.includes('ci') || lower.includes('build')) {
    return {
      text: 'CI success rate is 92.4% over the last 7 days (+2.1% vs baseline). Most failures are integration test timeouts.',
      evidence: [
        { metricId: 'ci-pass-rate', label: 'CI pass', value: '92.4%', trend: 'up' },
        { metricId: 'int-timeouts', label: 'Timeout failures', value: '34', trend: 'down' },
      ],
    };
  }

  if (lower.includes('deploy') || lower.includes('frequency')) {
    return {
      text: 'Deployment frequency averages 4.2 deploys/day (+8% month-over-month). Peak window is 10:00–14:00 UTC.',
      evidence: [
        { metricId: 'deploy-frequency', label: 'Deploy/day', value: '4.2', trend: 'up' },
      ],
    };
  }

  if (lower.includes('pr') || lower.includes('pull request')) {
    return {
      text: 'There are 8 open PRs awaiting review. Average PR cycle time is 22h (target is 18h).',
      evidence: [
        { metricId: 'open-prs', label: 'Open PRs', value: '8', trend: 'neutral' },
        { metricId: 'pr-cycle', label: 'Cycle time', value: '22h', trend: 'down' },
      ],
    };
  }

  if (lower.includes('lead') || lower.includes('time')) {
    return {
      text: 'Lead time for changes is 38h (p50). Backend is strongest at 22h, frontend is highest at 52h.',
      evidence: [
        { metricId: 'lead-time', label: 'Lead time p50', value: '38h', trend: 'neutral' },
      ],
    };
  }

  return {
    text: 'I can help with CI, deployments, PR throughput, DORA, and team velocity. Ask a specific metric question.',
  };
}

export const AIScreen = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: "Hi! I'm your Metraly AI assistant. Ask about CI, DORA, deployments, PR throughput, or team health.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function handleSend(text: string) {
    if (loading) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const reply = await simulateAIResponse(text);
      setMessages((prev) => [...prev, { role: 'assistant', text: reply.text, evidence: reply.evidence }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'I could not process that request right now. Try again in a moment.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AIWorkspaceLayout
      messages={messages}
      loading={loading}
      onSend={handleSend}
      quickPrompts={QUICK_PROMPTS}
      disclaimer="Powered by your private on-premise AI · No data leaves your infrastructure"
    />
  );
};
