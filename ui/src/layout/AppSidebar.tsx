import React, { useEffect, useState } from "react";
import {
  MetralySidebar,
  MetralySidebarSection,
  MetralySidebarItem,
  StateBadge,
  MetralyLogo,
} from "@metraly/ui";
import { Icon } from "../components/shared/Icon";
import { useDashboards } from "../hooks/useDashboards";

interface AppSidebarProps {
  active?: string;
  onNav?: (id: string) => void;
}

interface NavItem {
  id: string;
  icon: string;
  label: string;
  badge?: boolean;
}

const NAV_SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Intelligence',
    items: [
      { id: 'metrics', icon: 'chart', label: 'Metrics Explorer' },
      { id: 'ai', icon: 'brain', label: 'AI Workspace', badge: true },
    ],
  },
  {
    label: 'Ecosystem',
    items: [{ id: 'plugins', icon: 'puzzle', label: 'Plugins' }],
  },
  {
    label: 'Setup',
    items: [
      { id: 'wizard', icon: 'database', label: 'Connectors' },
      { id: 'settings', icon: 'settings', label: 'Settings' },
    ],
  },
];

export function AppSidebar({ active = "", onNav }: AppSidebarProps) {
  const collapsed = false;

  const { dashboards, isLoading: dashboardsLoading } = useDashboards();

  const dashboardNavItems = dashboards.map((d) => ({
    id: d.id,
    label: d.name,
    icon: d.icon || 'dashboard',
  }));

  const [pinned, setPinned] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("metraly-pinned");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("metraly-pinned", JSON.stringify(pinned));
  }, [pinned]);

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  };

  const pinnedItems = pinned
    .map((id) => dashboardNavItems.find((it) => it.id === id))
    .filter((it): it is NavItem => it !== undefined);
  const unpinnedDashboardItems = dashboardNavItems.filter((it) => !pinned.includes(it.id));

  const header = (
    <div style={{ padding: "18px 16px 14px", display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
      <MetralyLogo variant="horizontal" />
    </div>
  );

  const footer = (
    <div style={{ padding: "12px 10px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--m-bg-1)", border: "1px solid var(--m-line)", display: "grid", placeItems: "center", fontSize: 12 }}>AZ</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "var(--m-fg-0)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Alex Zubarev</div>
        <div style={{ fontSize: 11, color: "var(--m-fg-2)", fontFamily: "var(--m-font-mono)" }}>Owner</div>
      </div>
    </div>
  );

  return (
    <MetralySidebar collapsed={collapsed} header={header} footer={footer}>
      {pinnedItems.length > 0 && (
        <MetralySidebarSection label="Pinned">
          {pinnedItems.map((item) => (
            <MetralySidebarItem
              key={item.id}
              active={active === item.id}
              icon={<Icon name={item.icon} size={15} color="currentColor" />}
              label={item.label}
              meta={
                <button
                  type="button"
                  aria-label="Unpin"
                  onClick={(e) => togglePin(item.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m-fg-3)', padding: '0 2px', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
                >
                  <Icon name="pinOff" size={13} color="currentColor" />
                </button>
              }
              onClick={() => onNav?.(item.id)}
            />
          ))}
        </MetralySidebarSection>
      )}

      <MetralySidebarSection label="Dashboards">
        {dashboardsLoading ? (
          <>
            <div style={{ height: 32, borderRadius: 6, background: 'var(--m-bg-2)', margin: '2px 8px' }} />
            <div style={{ height: 32, borderRadius: 6, background: 'var(--m-bg-2)', margin: '2px 8px' }} />
          </>
        ) : (
          unpinnedDashboardItems.map((item) => (
            <MetralySidebarItem
              key={item.id}
              active={active === item.id}
              icon={<Icon name={item.icon} size={15} color="currentColor" />}
              label={item.label}
              meta={
                <button
                  type="button"
                  aria-label="Pin"
                  onClick={(e) => togglePin(item.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m-fg-3)', padding: '0 2px', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
                >
                  <Icon name="pin" size={13} color="currentColor" />
                </button>
              }
              onClick={() => onNav?.(item.id)}
            />
          ))
        )}
        <MetralySidebarItem
          active={active === "dash-wizard"}
          variant="accent"
          icon={<Icon name="plus" size={15} color="currentColor" />}
          label="New Dashboard"
          onClick={() => onNav?.("dash-wizard")}
        />
      </MetralySidebarSection>

      {NAV_SECTIONS.map((sec) => (
        <MetralySidebarSection key={sec.label} label={sec.label}>
          {sec.items.map((item) => (
            <MetralySidebarItem
              key={item.id}
              active={active === item.id}
              icon={<Icon name={item.icon} size={15} color="currentColor" />}
              label={item.label}
              meta={item.badge ? <StateBadge state="new" label="NEW" size="sm" /> : undefined}
              onClick={() => onNav?.(item.id)}
            />
          ))}
        </MetralySidebarSection>
      ))}
    </MetralySidebar>
  );
}
