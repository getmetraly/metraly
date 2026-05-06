// src/features/dashboardWizard/DashboardWizardScreen.tsx
import React from "react";
import { Icon } from "../../components/shared/Icon";
import { useWizardStore, TEMPLATES, WIDGET_LIBRARY } from "./store/wizardStore";
import { WizardPreviewGrid } from "./components/WizardPreviewGrid";

const CATS = ["All", "DORA", "CI/CD", "PR", "Sprint", "Team", "AI"];

const StepDot: React.FC<{
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}> = ({ n, label, active, done }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 5,
      minWidth: 60,
    }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: done
          ? "var(--cyan)"
          : active
            ? "rgba(0,229,255,0.15)"
            : "transparent",
        border: done
          ? "2px solid var(--cyan)"
          : active
            ? "2px solid var(--cyan)"
            : "2px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: active ? "0 0 12px rgba(0,229,255,0.3)" : "none",
      }}
    >
      {done ? (
        <Icon name="check" size={13} color="#0B0F19" />
      ) : (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            color: active ? "var(--cyan)" : "var(--muted)",
          }}
        >
          {n}
        </span>
      )}
    </div>
    <span
      style={{
        fontSize: 10.5,
        color: active ? "var(--text)" : "var(--muted)",
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </span>
  </div>
);

interface WizardProps {
  onSave?: (data: unknown) => void;
  onCancel?: () => void;
}

export const DashboardWizardScreen: React.FC<WizardProps> = ({
  onSave,
  onCancel,
}) => {
  const step = useWizardStore((s) => s.step);
  const setStep = useWizardStore((s) => s.setStep);
  const selectedTemplate = useWizardStore((s) => s.selectedTemplate);
  const setTemplate = useWizardStore((s) => s.setTemplate);
  const name = useWizardStore((s) => s.name);
  const desc = useWizardStore((s) => s.desc);
  const setName = useWizardStore((s) => s.setName);
  const setDesc = useWizardStore((s) => s.setDesc);
  const timeRange = useWizardStore((s) => s.timeRange);
  const setTimeRange = useWizardStore((s) => s.setTimeRange);
  const team = useWizardStore((s) => s.team);
  const setTeam = useWizardStore((s) => s.setTeam);
  const widgets = useWizardStore((s) => s.widgets);
  const addWidget = useWizardStore((s) => s.addWidget);
  const removeWidget = useWizardStore((s) => s.removeWidget);
  const toggleWidgetSize = useWizardStore((s) => s.toggleWidgetSize);
  const moveWidget = useWizardStore((s) => s.moveWidget);
  const widgetSizes = useWizardStore((s) => s.widgetSizes);

  const [widgetCat, setWidgetCat] = React.useState<string>("All");

  const steps = ["Template", "Widgets", "Settings"];

  const toggleWidget = (widgetId: string) => {
    const exists = widgets.find((w) => w.id === widgetId);
    if (exists) {
      removeWidget(exists.instanceId);
    } else {
      addWidget(widgetId);
    }
  };

  const filteredWidgets =
    widgetCat === "All"
      ? WIDGET_LIBRARY
      : WIDGET_LIBRARY.filter((w) => w.cat === widgetCat);

  const canContinue = [
    !!selectedTemplate,
    widgets.length > 0,
    name.trim().length > 0,
  ][step];

  const getCatColor = (cat: string): string => {
    const colors: Record<string, string> = {
      DORA: "#00E5FF",
      "CI/CD": "#00C853",
      PR: "#B44CFF",
      Sprint: "#FF9100",
      Team: "#00E5FF",
      AI: "#B44CFF",
    };
    return colors[cat] || "#00E5FF";
  };

  // Get layout once to avoid calling hook inside map
  const layout = useWizardStore((s) => s.layout);

  return (
    <div
      style={{ flex: 1, display: "flex", overflow: "hidden", height: "100%" }}
    >
      <div
        style={{
          width: 400,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <StepDot
                  n={i + 1}
                  label={s}
                  active={step === i}
                  done={step > i}
                />
                {i < steps.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: step > i ? "var(--cyan)" : "var(--border)",
                      marginTop: 13,
                      transition: "background 0.3s",
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "18px 20px" }}>
          {step === 0 && (
            <div>
              <div
                style={{
                  fontFamily: "var(--font-head)",
                  fontWeight: 700,
                  fontSize: 16,
                  marginBottom: 4,
                }}
              >
                Start from a template
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 18,
                }}
              >
                Choose a pre-built layout for your role, or start blank.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => setTemplate(tmpl.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 10,
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        border: isSelected
                          ? `1px solid ${tmpl.color}55`
                          : "1px solid var(--border)",
                        background: isSelected
                          ? `${tmpl.color}0a`
                          : "transparent",
                        boxShadow: isSelected
                          ? `0 0 12px ${tmpl.color}12`
                          : "none",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.borderColor = "var(--border2)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.borderColor = "var(--border)";
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9,
                          background: `${tmpl.color}18`,
                          border: `1px solid ${tmpl.color}25`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name={tmpl.icon} size={16} color={tmpl.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: "var(--text)",
                            fontFamily: "var(--font-head)",
                            marginBottom: 2,
                          }}
                        >
                          {tmpl.label}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "var(--muted)",
                            lineHeight: 1.4,
                          }}
                        >
                          {tmpl.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <Icon name="check" size={16} color={tmpl.color} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div
                style={{
                  fontFamily: "var(--font-head)",
                  fontWeight: 700,
                  fontSize: 16,
                  marginBottom: 4,
                }}
              >
                Customize widgets
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 14,
                }}
              >
                Add or remove widgets. Selected: {widgets.length}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 14,
                }}
              >
                {CATS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setWidgetCat(c)}
                    style={{
                      padding: "4px 11px",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                      border:
                        widgetCat === c
                          ? "1px solid rgba(0,229,255,0.4)"
                          : "1px solid var(--border)",
                      background:
                        widgetCat === c ? "rgba(0,229,255,0.1)" : "transparent",
                      color: widgetCat === c ? "var(--cyan)" : "var(--muted2)",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredWidgets.map((w) => {
                  const sel = widgets.some((x) => x.id === w.id);
                  const c = getCatColor(w.cat);
                  return (
                    <div
                      key={w.id}
                      onClick={() => toggleWidget(w.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 9,
                        cursor: "pointer",
                        border: sel
                          ? `1px solid ${c}40`
                          : "1px solid var(--border)",
                        background: sel ? `${c}0a` : "transparent",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: `${c}18`,
                          border: `1px solid ${c}22`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name={w.icon} size={13} color={c} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>
                          {w.label}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          {w.desc}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          border: sel ? "none" : "1.5px solid var(--border)",
                          background: sel ? c : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {sel && <Icon name="check" size={10} color="#0B0F19" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div
                style={{
                  fontFamily: "var(--font-head)",
                  fontWeight: 700,
                  fontSize: 16,
                  marginBottom: 4,
                }}
              >
                Dashboard settings
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 20,
                }}
              >
                Name it, configure defaults, and arrange widgets.
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Dashboard name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Backend Team Overview"
                  style={{
                    width: "100%",
                    background: "var(--glass)",
                    border: "1px solid var(--border)",
                    borderRadius: 9,
                    padding: "9px 12px",
                    color: "var(--text)",
                    fontSize: 13.5,
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Description
                </label>
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Optional — visible to teammates"
                  style={{
                    width: "100%",
                    background: "var(--glass)",
                    border: "1px solid var(--border)",
                    borderRadius: 9,
                    padding: "9px 12px",
                    color: "var(--text)",
                    fontSize: 13.5,
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Default time range
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["7d", "14d", "30d", "90d"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeRange(t)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 7,
                        cursor: "pointer",
                        fontSize: 13,
                        border:
                          timeRange === t
                            ? "1px solid rgba(0,229,255,0.4)"
                            : "1px solid var(--border)",
                        background:
                          timeRange === t
                            ? "rgba(0,229,255,0.1)"
                            : "transparent",
                        color:
                          timeRange === t ? "var(--cyan)" : "var(--muted2)",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Team scope
                </label>
                <select
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--glass)",
                    border: "1px solid var(--border)",
                    borderRadius: 9,
                    padding: "9px 12px",
                    color: "var(--text)",
                    fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  {[
                    "All teams",
                    "Platform",
                    "Backend",
                    "Frontend",
                    "Mobile",
                    "Data",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Widget layout — drag to reorder, toggle width
                </label>
                {widgets.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--muted)",
                      opacity: 0.6,
                    }}
                  >
                    No widgets — go back to step 1.
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {widgets.map((w, idx) => {
                      const c = getCatColor(w.cat);
                      const isLg = widgetSizes[w.instanceId] === "full";
                      return (
                        <div
                          key={w.instanceId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--border)",
                            borderRadius: 9,
                            padding: "8px 10px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                            }}
                          >
                            <button
                              onClick={() => moveWidget(idx, idx - 1)}
                              disabled={idx === 0}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: idx === 0 ? "default" : "pointer",
                                color:
                                  idx === 0 ? "var(--border)" : "var(--muted)",
                                padding: "1px 3px",
                                fontSize: 10,
                              }}
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveWidget(idx, idx + 1)}
                              disabled={idx === widgets.length - 1}
                              style={{
                                background: "none",
                                border: "none",
                                cursor:
                                  idx === widgets.length - 1
                                    ? "default"
                                    : "pointer",
                                color:
                                  idx === widgets.length - 1
                                    ? "var(--border)"
                                    : "var(--muted)",
                                padding: "1px 3px",
                                fontSize: 10,
                              }}
                            >
                              ▼
                            </button>
                          </div>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              background: `${w.color}18`,
                              border: `1px solid ${w.color}22`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Icon name={w.icon} size={12} color={w.color} />
                          </div>
                          <div
                            style={{ flex: 1, fontSize: 12, fontWeight: 500 }}
                          >
                            {w.label}
                          </div>
                          <button
                            onClick={() => toggleWidgetSize(w.instanceId)}
                            style={{
                              padding: "3px 8px",
                              borderRadius: 5,
                              fontSize: 11,
                              cursor: "pointer",
                              border: `1px solid ${isLg ? "rgba(0,229,255,0.3)" : "var(--border)"}`,
                              background: isLg
                                ? "rgba(0,229,255,0.08)"
                                : "transparent",
                              color: isLg ? "var(--cyan)" : "var(--muted)",
                            }}
                          >
                            {isLg ? "Full" : "Flex"}
                          </button>
                          <button
                            onClick={() => removeWidget(w.instanceId)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--muted)",
                            }}
                          >
                            <Icon name="x" size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => (step === 0 ? onCancel?.() : setStep(step - 1))}
            style={{
              padding: "8px 18px",
              borderRadius: 9,
              cursor: "pointer",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--muted2)",
              fontSize: 13,
            }}
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button
            onClick={() =>
              step === steps.length - 1
                ? onSave?.({
                    name,
                    widgets,
                    timeRange,
                    team,
                    description: desc,
                  })
                : setStep(step + 1)
            }
            disabled={!canContinue}
            style={{
              padding: "8px 22px",
              borderRadius: 9,
              cursor: canContinue ? "pointer" : "not-allowed",
              background: step === steps.length - 1 ? "#00C853" : "var(--grad)",
              border: "none",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              opacity: canContinue ? 1 : 0.4,
            }}
          >
            {step === steps.length - 1 ? "Save Dashboard" : "Continue"}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        <WizardPreviewGrid />
      </div>
    </div>
  );
};
