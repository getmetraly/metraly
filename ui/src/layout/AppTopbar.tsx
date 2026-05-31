import React from "react";
import { MetralyTopbar } from "@metraly/ui";
import { Icon } from "../components/shared/Icon";
import { useTweaks } from "../context/TweaksContext";

interface AppTopbarProps {
  title?: string;
  subtitle?: string;
}

export function AppTopbar({ title, subtitle }: AppTopbarProps) {
  const { tweaks } = useTweaks();
  const density = tweaks.density as "compact" | "comfortable" | "spacious";

  const actions = (
    <>
      {/* Use brandbook CSS classes — metraly-app-topbar__search and metraly-app-icon-btn
          are defined in metraly-app-kit.css (imported via @metraly/ui/styles.css). */}
      <div className="metraly-app-topbar__search" role="search" aria-label="Quick search">
        <span className="metraly-app-topbar__search-icon">
          <Icon name="search" size={13} />
        </span>
        <span style={{ flex: 1, fontSize: 13, color: "var(--m-fg-2)", userSelect: "none", pointerEvents: "none" }}>
          Quick search…
        </span>
        <kbd style={{ fontSize: 11, fontFamily: "var(--m-font-mono)", color: "var(--m-fg-3)", background: "var(--m-bg-3)", padding: "1px 5px", borderRadius: "var(--m-r-1)", fontStyle: "normal" }}>
          ⌘K
        </kbd>
      </div>
      <button
        type="button"
        className="metraly-app-icon-btn metraly-app-topbar__bell"
        aria-label="Notifications"
        style={{ position: "relative", width: 32, height: 32 }}
      >
        <Icon name="bell" size={15} />
        <span
          aria-hidden="true"
          style={{ position: "absolute", top: 5, right: 5, width: 7, height: 7, background: "var(--m-cyan-500)", borderRadius: "50%", border: "1.5px solid var(--m-bg-1)" }}
        />
      </button>
    </>
  );

  return (
    <MetralyTopbar
      title={title ?? ""}
      subtitle={subtitle}
      density={density}
      actions={actions}
    />
  );
}
