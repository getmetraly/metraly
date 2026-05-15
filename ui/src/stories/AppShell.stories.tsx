import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';

// ---------------------------------------------------------------------------
// Minimal shell layout (no API hooks, no context providers)
// ---------------------------------------------------------------------------

const NAV_SECTIONS = [
  {
    label: 'Dashboards',
    items: [
      { id: 'dashboard', icon: '⌂', label: 'Overview', active: true },
      { id: 'dash-cto', icon: '▲', label: 'CTO' },
      { id: 'dash-vp', icon: '□', label: 'VP Engineering' },
      { id: 'dash-tl', icon: '○', label: 'Tech Lead' },
      { id: 'dash-devops', icon: '◆', label: 'DevOps / SRE' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { id: 'metrics', icon: '≈', label: 'Metrics Explorer' },
      { id: 'ai', icon: '✦', label: 'AI Workspace' },
    ],
  },
  {
    label: 'Configure',
    items: [
      { id: 'plugins', icon: '▤', label: 'Plugins' },
      { id: 'wizard', icon: '►', label: 'Connectors' },
    ],
  },
];

function AppShellLayout({
  active = 'dashboard',
  collapsed = false,
  title = 'Overview',
  children,
}: {
  active?: string;
  collapsed?: boolean;
  title?: string;
  children?: React.ReactNode;
}) {
  const sidebarWidth = collapsed ? 64 : 220;

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: '#0B0F19',
        color: '#E2E6F0',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          background: 'rgba(11,15,25,0.97)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? '18px 0' : '20px 18px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            textAlign: collapsed ? 'center' : 'left',
          }}
        >
          {collapsed ? (
            <span style={{ fontSize: 18, fontWeight: 800, color: '#00E5FF' }}>M</span>
          ) : (
            <span style={{ fontSize: 15, fontWeight: 800, color: '#00E5FF', letterSpacing: '-0.3px' }}>
              metraly
            </span>
          )}
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <div
                  style={{
                    padding: '10px 14px 4px',
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'rgba(226,230,240,0.35)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {section.label}
                </div>
              )}
              {section.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: collapsed ? '9px 0' : '7px 12px',
                    margin: '1px 6px',
                    borderRadius: 7,
                    cursor: 'pointer',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: item.id === active ? 'rgba(0,229,255,0.09)' : 'transparent',
                    color: item.id === active ? '#00E5FF' : 'rgba(226,230,240,0.6)',
                    borderLeft: item.id === active ? '2px solid #00E5FF' : '2px solid transparent',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {!collapsed && (
                    <span style={{ fontSize: 12, fontWeight: item.id === active ? 600 : 400 }}>
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: collapsed ? '12px 0' : '12px 14px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            textAlign: collapsed ? 'center' : 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(0,229,255,0.15)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#00E5FF',
              flexShrink: 0,
            }}
          >
            JD
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#E2E6F0' }}>Jane Doe</div>
              <div style={{ fontSize: 9, color: 'rgba(226,230,240,0.4)' }}>Engineering Lead</div>
            </div>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header
          style={{
            height: 51,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 12,
            background: 'rgba(11,15,25,0.9)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: '#E2E6F0' }}>{title}</span>
          <div style={{ flex: 1 }} />
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 13,
              color: 'rgba(226,230,240,0.5)',
              cursor: 'pointer',
            }}
          >
            🔔
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 10px',
              borderRadius: 8,
              background: 'rgba(0,229,255,0.06)',
              border: '1px solid rgba(0,229,255,0.15)',
              fontSize: 11,
              color: '#00E5FF',
              cursor: 'pointer',
            }}
          >
            ✦ Ask AI
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children ?? (
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                height: 200,
                color: 'rgba(226,230,240,0.3)',
                fontSize: 12,
                border: '1px dashed rgba(255,255,255,0.08)',
                borderRadius: 10,
              }}
            >
              Main content area
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Shells/AppShell',
  parameters: { layout: 'fullscreen' },
};

export default meta;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default: expanded sidebar, Overview active. */
export const Default: StoryObj = {
  render: () => <AppShellLayout active="dashboard" title="Overview" />,
};

/** Collapsed sidebar: icon-only navigation. */
export const CollapsedSidebar: StoryObj = {
  render: () => <AppShellLayout active="metrics" collapsed title="Metrics Explorer" />,
};

/** AI Workspace active: correct nav highlight for AI Workspace route. */
export const AIWorkspaceActive: StoryObj = {
  render: () => <AppShellLayout active="ai" title="AI Workspace" />,
};
