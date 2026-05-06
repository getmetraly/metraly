import React from "react";
import { Responsive } from "react-grid-layout";
import { WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import { useWizardStore } from "../store/wizardStore";
import { WidgetPreviewCard } from "./WidgetPreviewCard";
import { Icon } from "../../../components/shared/Icon";

const ResponsiveGridLayout = WidthProvider(Responsive);

export const WizardPreviewGrid: React.FC = () => {
  const { widgets, layout, updateLayout, name } = useWizardStore();

  // Add isResizable per item
  const layoutWithMeta = layout.map(item => ({
    ...item,
    isResizable: item.w !== 12,
  }));

  const headerStyle = {
    padding: "12px 18px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(11,15,25,0.6)",
  };

  return (
    <div
      style={{
        flex: 1,
        background: "rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={headerStyle}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--cyan)",
            animation: "pulse-dot 2s infinite",
          }}
        />
        <span
          style={{
            fontSize: 12.5,
            fontFamily: "var(--font-head)",
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          {name || "My Dashboard"} — Preview
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            marginLeft: "auto",
          }}
        >
          {widgets.length} widget{widgets.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {widgets.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              opacity: 0.5,
            }}
          >
            <Icon name="layers" size={32} color="var(--muted)" />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              Add widgets to see a preview
            </span>
          </div>
        ) : (
<ResponsiveGridLayout
              style={{ width: "100%", maxWidth: "100%" }}
              layouts={{ lg: layoutWithMeta }}
              breakpoints={{ lg: 1200, md: 996, sm: 768 }}
              cols={{ lg: 12, md: 10, sm: 6 }}
              rowHeight={100}
              isDraggable={true}
              isResizable={true}
              onLayoutChange={(currentLayout) => updateLayout(currentLayout)}
              draggableHandle=".widget-drag-handle"
              compactType="vertical"
              margin={[8, 8]}
            >
            {widgets.map((w) => (
              <div key={w.instanceId}>
                <WidgetPreviewCard widget={w} />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
};
