import React, { useState, useEffect } from "react";
import {
  MetralySidebar,
  MetralySidebarSection,
  MetralySidebarItem,
  StateBadge,
} from "@metraly/ui";
import { Icon } from "../../components/shared/Icon";
import { useTweaks } from "../../context/TweaksContext";

interface SidebarCompatProps {
  active?: string;
  onNav?: (id: string) => void;
}

interface NavItem {
  id: string;
  icon: string;
  label: string;
  badge?: boolean;
}

const SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Dashboards",
    items: [
      { id: "dashboard", icon: "home", label: "Overview" },
      { id: "dash-cto", icon: "trendingUp", label: "CTO" },
      { id: "dash-vp", icon: "users", label: "VP Engineering" },
      { id: "dash-tl", icon: "gitPR", label: "Tech Lead" },
      { id: "dash-devops", icon: "cpu", label: "DevOps / SRE" },
      { id: "dash-ic", icon: "activity", label: "My View" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { id: "metrics", icon: "bar2", label: "Metrics Explorer" },
      { id: "ai", icon: "brain", label: "AI Workspace", badge: true },
    ],
  },
  {
    label: "Configure",
    items: [
      { id: "plugins", icon: "puzzle", label: "Plugins" },
      { id: "wizard", icon: "link", label: "Connectors" },
    ],
  },
  {
    label: "System",
    items: [{ id: "settings", icon: "settings", label: "Settings" }],
  },
];

const DASHBOARD_ITEMS = SECTIONS[0].items;

export const SidebarCompat: React.FC<SidebarCompatProps> = ({ active = "", onNav }) => {
  const { tweaks } = useTweaks();
  const collapsed = tweaks.sidebarCollapsed as boolean;

  const [pinned, setPinned] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("metraly-pinned");
      return saved ? (JSON.parse(saved) as string[]) : ["dash-cto", "dash-devops"];
    } catch {
      return ["dash-cto", "dash-devops"];
    }
  });

  useEffect(() => {
    localStorage.setItem("metraly-pinned", JSON.stringify(pinned));
  }, [pinned]);

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinned((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const pinnedItems = pinned
    .map((id) => DASHBOARD_ITEMS.find((it) => it.id === id))
    .filter((it): it is NavItem => it !== undefined);
  const unpinnedDashboardItems = DASHBOARD_ITEMS.filter((it) => !pinned.includes(it.id));

  const header = (
    <div style={{ padding: collapsed ? "16px 0" : "20px 18px 16px", textAlign: collapsed ? "center" : "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : 10, justifyContent: collapsed ? "center" : "flex-start" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--grad)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="activity" size={16} color="#fff" />
        </div>
        {!collapsed && (
          <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 17, background: "var(--grad)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Metraly
          </span>
        )}
      </div>
      {!collapsed && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, background: "color-mix(in srgb, var(--success) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 20%, transparent)", borderRadius: 20, padding: "4px 10px", width: "fit-content" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", animation: "pulse-dot 2s ease infinite" }} />
          <span style={{ fontSize: 11, color: "var(--success)", fontFamily: "var(--font-mono)" }}>All systems nominal</span>
        </div>
      )}
    </div>
  );

  const footer = !collapsed ? (
    <div style={{ padding: "12px 10px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "color-mix(in srgb, var(--cyan) 10%, transparent)", border: "1px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "var(--muted2)" }}>
        JD
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)" }}>Jamie Dev</div>
        <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Admin</div>
      </div>
      <button
        type="button"
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
        onClick={() => onNav?.("settings")}
        aria-label="Settings"
      >
        <Icon name="settings" size={14} />
      </button>
    </div>
  ) : undefined;

  return (
    <MetralySidebar collapsed={collapsed} header={header} footer={footer}>
      {!collapsed && pinnedItems.length > 0 && (
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
                  style={{ background: "none", border: "none", cursor: "pointer", color: "color-mix(in srgb, var(--cyan) 50%, transparent)", fontSize: 12, padding: "0 2px", lineHeight: 1 }}
                >
                  ×
                </button>
              }
              onClick={() => onNav?.(item.id)}
            />
          ))}
        </MetralySidebarSection>
      )}

      <MetralySidebarSection label={collapsed ? undefined : "Dashboards"}>
        {unpinnedDashboardItems.map((item) => (
          <MetralySidebarItem
            key={item.id}
            active={active === item.id}
            icon={<Icon name={item.icon} size={15} color="currentColor" />}
            label={item.label}
            meta={
              !collapsed ? (
                <button
                  type="button"
                  aria-label={pinned.includes(item.id) ? "Unpin" : "Pin to top"}
                  onClick={(e) => togglePin(item.id, e)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "0 2px", fontSize: 12, lineHeight: 1 }}
                >
                  📌
                </button>
              ) : undefined
            }
            onClick={() => onNav?.(item.id)}
          />
        ))}
        {!collapsed && (
          <MetralySidebarItem
            active={active === "dash-wizard"}
            variant="accent"
            icon={<Icon name="plus" size={15} color="currentColor" />}
            label="New Dashboard"
            onClick={() => onNav?.("dash-wizard")}
          />
        )}
      </MetralySidebarSection>

      {SECTIONS.slice(1).map((sec) => (
        <MetralySidebarSection key={sec.label} label={collapsed ? undefined : sec.label}>
          {sec.items.map((item) => (
            <MetralySidebarItem
              key={item.id}
              active={active === item.id}
              icon={<Icon name={item.icon} size={15} color="currentColor" />}
              label={item.label}
              meta={item.badge && !collapsed ? <StateBadge state="new" label="NEW" size="sm" /> : undefined}
              onClick={() => onNav?.(item.id)}
            />
          ))}
        </MetralySidebarSection>
      ))}
    </MetralySidebar>
  );
};
