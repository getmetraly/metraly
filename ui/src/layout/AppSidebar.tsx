import React, { useEffect, useState } from "react";
import {
  MetralySidebar,
  MetralySidebarSection,
  MetralySidebarItem,
  StateBadge,
  MetralyLogo,
} from "@metraly/ui";
import { Icon } from "../components/shared/Icon";
import { useTweaks } from "../context/TweaksContext";

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

const SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Dashboards",
    items: [
      { id: "overview", icon: "home", label: "Overview" },
      { id: "dash-cto", icon: "bar2", label: "CTO" },
      { id: "dash-vp", icon: "users", label: "VP Eng" },
      { id: "dash-tl", icon: "gitPR", label: "Tech Lead" },
      { id: "dash-devops", icon: "activity", label: "DevOps / SRE" },
      { id: "dash-ic", icon: "clock", label: "IC" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "metrics", icon: "chart", label: "Metrics Explorer" },
      { id: "ai", icon: "brain", label: "AI Workspace", badge: true },
    ],
  },
  {
    label: "Ecosystem",
    items: [{ id: "plugins", icon: "puzzle", label: "Plugins" }],
  },
  {
    label: "Setup",
    items: [
      { id: "wizard", icon: "database", label: "Connectors" },
      { id: "settings", icon: "settings", label: "Settings" },
    ],
  },
];

const DASHBOARD_ITEMS = SECTIONS[0].items;

export function AppSidebar({ active = "", onNav }: AppSidebarProps) {
  const { tweaks } = useTweaks();
  const collapsed = tweaks.sidebarCollapsed as boolean;

  const [pinned, setPinned] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("metraly-pinned");
      return raw ? JSON.parse(raw) : ["overview"];
    } catch {
      return ["overview"];
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
    .map((id) => DASHBOARD_ITEMS.find((it) => it.id === id))
    .filter((it): it is NavItem => it !== undefined);
  const unpinnedDashboardItems = DASHBOARD_ITEMS.filter((it) => !pinned.includes(it.id));

  const header = (
    <div style={{ padding: collapsed ? "14px 12px" : "18px 16px 14px", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start" }}>
      <MetralyLogo variant={collapsed ? "mark" : "horizontal"} />
    </div>
  );

  const footer = !collapsed ? (
    <div style={{ padding: "12px 10px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--glass)", border: "1px solid var(--border)", display: "grid", placeItems: "center", fontSize: 12 }}>AZ</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Alex Zubarev</div>
        <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Owner</div>
      </div>
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
                <span
                  aria-hidden="true"
                  onClick={(e) => togglePin(item.id, e as unknown as React.MouseEvent)}
                  style={{ cursor: "pointer", color: "color-mix(in srgb, var(--cyan) 50%, transparent)", fontSize: 12, padding: "0 2px", lineHeight: 1 }}
                >
                  ×
                </span>
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
                <span
                  aria-hidden="true"
                  onClick={(e) => togglePin(item.id, e as unknown as React.MouseEvent)}
                  style={{ cursor: "pointer", color: "var(--muted)", padding: "0 2px", lineHeight: 1, display: "inline-flex", alignItems: "center", opacity: 0.6 }}
                >
                  <Icon name="pin" size={11} color="currentColor" />
                </span>
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
}
