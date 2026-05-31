// src/components/layout/DraggableTweaksPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../shared/Icon';

// Default values
const DEFAULT_TWEAKS = {
  accentColor: '#00E5FF',
  density: 'comfortable',
  showSparklines: true,
  sidebarCollapsed: false,
};

export const DraggableTweaksPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tweaks, setTweaks] = useState(() => {
    try {
      const saved = localStorage.getItem('metraly-tweaks');
      return saved ? { ...DEFAULT_TWEAKS, ...JSON.parse(saved) } : DEFAULT_TWEAKS;
    } catch {
      return DEFAULT_TWEAKS;
    }
  });

  // Position state
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('metraly-tweaks-position');
      return saved ? JSON.parse(saved) : { x: 16, y: 16 };
    } catch {
      return { x: 16, y: 16 };
    }
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const PAD = 16;

  // Save tweaks to localStorage
  useEffect(() => {
    localStorage.setItem('metraly-tweaks', JSON.stringify(tweaks));
    // Apply CSS variable for accent color
    document.documentElement.style.setProperty('--cyan', tweaks.accentColor);
    // Dispatch custom event for density (optional)
    window.dispatchEvent(new CustomEvent('tweaks-changed', { detail: tweaks }));
  }, [tweaks]);

  // Save position
  useEffect(() => {
    localStorage.setItem('metraly-tweaks-position', JSON.stringify(position));
  }, [position]);

  // Clamp position to viewport
  const clampPosition = () => {
    const el = panelRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    setPosition((prev: { x: number; y: number }) => ({
      x: Math.min(maxRight, Math.max(PAD, prev.x)),
      y: Math.min(maxBottom, Math.max(PAD, prev.y)),
    }));
  };

  useEffect(() => {
    if (isOpen) {
      clampPosition();
      window.addEventListener('resize', clampPosition);
      return () => window.removeEventListener('resize', clampPosition);
    }
  }, [isOpen]);

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.twk-no-drag')) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: position.x, y: position.y };
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const dx = dragStart.current.x - e.clientX;
    const dy = dragStart.current.y - e.clientY;
    let newX = startPos.current.x + dx;
    let newY = startPos.current.y + dy;
    // Clamp while dragging
    const el = panelRef.current;
    if (el) {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      newX = Math.min(window.innerWidth - w - PAD, Math.max(PAD, newX));
      newY = Math.min(window.innerHeight - h - PAD, Math.max(PAD, newY));
    }
    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    clampPosition();
  };

  const setTweak = (key: string, value: unknown) => setTweaks((prev: Record<string, unknown>) => ({ ...prev, [key]: value }));

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          background: 'var(--glass)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '6px 12px',
          color: 'var(--cyan)',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          transition: 'all 0.15s',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--glass)'}
      >
        <Icon name="settings" size={12} color="currentColor" /> Tweaks
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        right: position.x,
        bottom: position.y,
        width: 280,
        background: 'var(--glass2)',
        border: '1px solid var(--border2)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 1001,
        backdropFilter: 'blur(8px)',
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        color: 'var(--text)',
        cursor: 'default',
      }}
    >
      {/* Header – draggable */}
      <div
        ref={dragRef}
        onMouseDown={handleDragStart}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          borderBottom: '1px solid var(--border)',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <span style={{ fontWeight: 600 }}>Tweaks</span>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Accent Color */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Accent color</label>
          <input
            type="color"
            value={tweaks.accentColor}
            onChange={e => setTweak('accentColor', e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: 4,
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          />
        </div>

        {/* Density */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Density</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['compact', 'comfortable', 'spacious'].map(d => (
              <button
                key={d}
                onClick={() => setTweak('density', d)}
                style={{
                  flex: 1,
                  padding: '5px 0',
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                  background: tweaks.density === d ? 'rgba(0,229,255,0.15)' : 'transparent',
                  border: tweaks.density === d ? '1px solid rgba(0,229,255,0.3)' : '1px solid var(--border)',
                  color: tweaks.density === d ? 'var(--cyan)' : 'var(--muted2)',
                  textTransform: 'capitalize',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Show Sparklines */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 11, color: 'var(--muted)' }}>Show sparklines</label>
          <button
            onClick={() => setTweak('showSparklines', !tweaks.showSparklines)}
            style={{
              width: 32,
              height: 18,
              borderRadius: 9,
              background: tweaks.showSparklines ? 'var(--cyan)' : 'rgba(255,255,255,0.15)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 2,
                left: tweaks.showSparklines ? 16 : 2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s',
              }}
            />
          </button>
        </div>

        {/* Sidebar Collapsed */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 11, color: 'var(--muted)' }}>Collapse sidebar</label>
          <button
            onClick={() => setTweak('sidebarCollapsed', !tweaks.sidebarCollapsed)}
            style={{
              width: 32,
              height: 18,
              borderRadius: 9,
              background: tweaks.sidebarCollapsed ? 'var(--cyan)' : 'rgba(255,255,255,0.15)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 2,
                left: tweaks.sidebarCollapsed ? 16 : 2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s',
              }}
            />
          </button>
        </div>

        {/* Reset button */}
        <button
          onClick={() => setTweaks(DEFAULT_TWEAKS)}
          style={{
            marginTop: 8,
            padding: '6px 0',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            color: 'var(--muted2)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
};
