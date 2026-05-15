import React from "react";
import { MetralyTopbar } from "@metraly/ui";
import { Icon } from "../../components/shared/Icon";
import { useTweaks } from "../../context/TweaksContext";

interface TopbarCompatProps {
  title?: string;
  subtitle?: string;
}

export const TopbarCompat: React.FC<TopbarCompatProps> = ({ title, subtitle }) => {
  const { tweaks } = useTweaks();
  const density = tweaks.density as "compact" | "comfortable" | "spacious";

  const actions = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{ display: "flex", alignItems: "center", background: "var(--glass)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", gap: 8, width: 220 }}
        role="search"
      >
        <Icon name="search" size={13} color="var(--muted)" />
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Quick search…</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 4 }}>⌘K</span>
      </div>
      <button
        type="button"
        aria-label="Notifications"
        style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "var(--muted2)", position: "relative" }}
      >
        <Icon name="bell" size={15} />
        <div style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, background: "var(--cyan)", borderRadius: "50%", border: "1.5px solid var(--bg)" }} />
      </button>
    </div>
  );

  return (
    <MetralyTopbar
      title={title ?? ""}
      subtitle={subtitle}
      density={density}
      actions={actions}
    />
  );
};
