import React from 'react';

type BadgeStatus = 'On track' | 'At risk' | 'Blocked' | 'Done' | 'Open';

interface BadgeProps {
  status: BadgeStatus | string;
}

export const Badge = ({ status }: BadgeProps) => {
  const map: Record<string, { color: string; background: string; borderColor: string }> = {
    'On track': {
      color: 'var(--success)',
      background: 'color-mix(in srgb, var(--success) 12%, transparent)',
      borderColor: 'color-mix(in srgb, var(--success) 30%, transparent)',
    },
    'At risk': {
      color: 'var(--warning)',
      background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
      borderColor: 'color-mix(in srgb, var(--warning) 30%, transparent)',
    },
    'Blocked': {
      color: 'var(--error)',
      background: 'color-mix(in srgb, var(--error) 12%, transparent)',
      borderColor: 'color-mix(in srgb, var(--error) 30%, transparent)',
    },
    'Done': {
      color: 'var(--success)',
      background: 'color-mix(in srgb, var(--success) 10%, transparent)',
      borderColor: 'color-mix(in srgb, var(--success) 30%, transparent)',
    },
    'Open': {
      color: 'var(--cyan)',
      background: 'color-mix(in srgb, var(--cyan) 10%, transparent)',
      borderColor: 'color-mix(in srgb, var(--cyan) 30%, transparent)',
    },
  };
  const fallback = {
    color: 'var(--muted)',
    background: 'color-mix(in srgb, var(--muted) 10%, transparent)',
    borderColor: 'color-mix(in srgb, var(--muted) 30%, transparent)',
  };
  const { color, background, borderColor } = map[status] || fallback;

  return (
    <span
      style={{
        fontSize: 10.5,
        color,
        background,
        border: `1px solid ${borderColor}`,
        borderRadius: 4,
        padding: '2px 7px',
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
};
