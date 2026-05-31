// src/features/dashboardWizard/DashboardWizardScreen.tsx
import React from "react";
import {
  Icon,
  StepRail,
  MetralyButton,
  MetralyInput,
  MetralySelect,
  WidgetPickerCard,
  WidgetPickerList,
  MetralySegmentedControl,
} from "../../design-system";
import type { StepRailStep, MetralySelectOption } from "../../design-system";
import { createDashboard } from "../../api/client";
import { buildCreateDashboardRequest } from "../dashboardEditor/payload";
import { useWizardStore, TEMPLATES, WIDGET_LIBRARY } from "./store/wizardStore";
import { WizardPreviewGrid } from "./components/WizardPreviewGrid";

const CATS = ["All", "DORA", "CI/CD", "PR", "Sprint", "Team", "AI"];

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
  const reset = useWizardStore((s) => s.reset);

  const [widgetCat, setWidgetCat] = React.useState<string>("All");
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

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

  const handleSave = async () => {
    if (isSaving) {
      return;
    }
    setSaveError("");
    setIsSaving(true);
    try {
      const saved = await createDashboard(buildCreateDashboardRequest(useWizardStore.getState()));
      reset();
      onSave?.(saved);
    } catch (error) {
      console.error("Failed to save dashboard:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save dashboard");
    } finally {
      setIsSaving(false);
    }
  };

  const railSteps: StepRailStep[] = steps.map((s, i) => ({
    id: String(i),
    label: s,
    status: step === i ? "current" : step > i ? "done" : "next",
  }));

  const teamOptions: MetralySelectOption[] = [
    "All teams",
    "Platform",
    "Backend",
    "Frontend",
    "Mobile",
    "Data",
  ].map((t) => ({ value: t, label: t }));

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
          borderRight: "1px solid var(--m-line)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--m-line)",
            flexShrink: 0,
          }}
        >
          <StepRail steps={railSteps} ariaLabel="Dashboard wizard steps" />
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "18px 20px" }}>
          {step === 0 && (
            <div>
              <div
                style={{
                  fontFamily: "var(--m-font-display)",
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
                  color: "var(--m-fg-2)",
                  marginBottom: 18,
                }}
              >
                Choose a pre-built layout for your role, or start blank.
              </div>
              <WidgetPickerList style={{ flexDirection: "column", gap: 8 }}>
                {TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate === tmpl.id;
                  return (
                    <WidgetPickerCard
                      key={tmpl.id}
                      title={tmpl.label}
                      description={tmpl.desc}
                      selected={isSelected}
                      iconLabel={tmpl.icon}
                      onSelect={() => setTemplate(tmpl.id)}
                    />
                  );
                })}
              </WidgetPickerList>
            </div>
          )}

          {step === 1 && (
            <div>
              <div
                style={{
                  fontFamily: "var(--m-font-display)",
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
                  color: "var(--m-fg-2)",
                  marginBottom: 14,
                }}
              >
                Add or remove widgets. Selected: {widgets.length}
              </div>
              <div style={{ marginBottom: 14 }}>
                <MetralySegmentedControl
                  options={CATS.map((c) => ({ value: c, label: c }))}
                  value={widgetCat}
                  onChange={setWidgetCat}
                  size="sm"
                  ariaLabel="Widget category"
                />
              </div>
              <WidgetPickerList ariaLabel="Widget catalog" style={{ flexDirection: "column", gap: 6 }}>
                {filteredWidgets.map((w) => {
                  const sel = widgets.some((x) => x.id === w.id);
                  return (
                    <WidgetPickerCard
                      key={w.id}
                      title={w.label}
                      description={w.desc}
                      selected={sel}
                      iconLabel={w.icon}
                      onSelect={() => toggleWidget(w.id)}
                    />
                  );
                })}
              </WidgetPickerList>
            </div>
          )}

          {step === 2 && (
            <div>
              <div
                style={{
                  fontFamily: "var(--m-font-display)",
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
                  color: "var(--m-fg-2)",
                  marginBottom: 20,
                }}
              >
                Name it, configure defaults, and arrange widgets.
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="dashboard-wizard-name"
                  style={{
                    fontSize: 12,
                    color: "var(--m-fg-2)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Dashboard name *
                </label>
                <MetralyInput
                  id="dashboard-wizard-name"
                  name="dashboard-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  placeholder="e.g. Backend Team Overview"
                  fullWidth
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="dashboard-wizard-description"
                  style={{
                    fontSize: 12,
                    color: "var(--m-fg-2)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Description
                </label>
                <MetralyInput
                  id="dashboard-wizard-description"
                  name="dashboard-description"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  autoComplete="off"
                  placeholder="Optional - visible to teammates"
                  fullWidth
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--m-fg-2)",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Default time range
                </div>
                <MetralySegmentedControl
                  options={["7d", "14d", "30d", "90d"].map((t) => ({ value: t, label: t }))}
                  value={timeRange}
                  onChange={setTimeRange}
                  size="sm"
                  ariaLabel="Default time range"
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="dashboard-wizard-team"
                  style={{
                    fontSize: 12,
                    color: "var(--m-fg-2)",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Team scope
                </label>
                <MetralySelect
                  id="dashboard-wizard-team"
                  name="dashboard-team"
                  value={team}
                  options={teamOptions}
                  onChange={setTeam}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--m-fg-2)",
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
                      color: "var(--m-fg-2)",
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
                      const isLg = widgetSizes[w.instanceId] === "full";
                      return (
                        <div
                          key={w.instanceId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "var(--m-bg-2)",
                            border: "1px solid var(--m-line)",
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
                              type="button"
                              aria-label={`Move ${w.label} up`}
                              onClick={() => moveWidget(idx, idx - 1)}
                              disabled={idx === 0}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: idx === 0 ? "default" : "pointer",
                                color:
                                  idx === 0 ? "var(--m-line)" : "var(--m-fg-2)",
                                padding: "1px 3px",
                                fontSize: 10,
                              }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${w.label} down`}
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
                                    ? "var(--m-line)"
                                    : "var(--m-fg-2)",
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
                              background: `color-mix(in srgb, ${w.color} 12%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${w.color} 16%, transparent)`,
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
                            type="button"
                            aria-label={isLg ? `Make ${w.label} flexible width` : `Make ${w.label} full width`}
                            onClick={() => toggleWidgetSize(w.instanceId)}
                            style={{
                              padding: "3px 8px",
                              borderRadius: 5,
                              fontSize: 11,
                              cursor: "pointer",
                              border: `1px solid ${isLg ? "color-mix(in srgb, var(--m-cyan-500) 30%, transparent)" : "var(--m-line)"}`,
                              background: isLg
                                ? "color-mix(in srgb, var(--m-cyan-500) 8%, transparent)"
                                : "transparent",
                              color: isLg ? "var(--m-cyan-500)" : "var(--m-fg-2)",
                            }}
                          >
                            {isLg ? "Full" : "Flex"}
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${w.label}`}
                            onClick={() => removeWidget(w.instanceId)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--m-fg-2)",
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
            borderTop: "1px solid var(--m-line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <MetralyButton
            type="button"
            variant="ghost"
            onClick={() => (step === 0 ? onCancel?.() : setStep(step - 1))}
          >
            {step === 0 ? "Cancel" : "Back"}
          </MetralyButton>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {saveError && (
              <div
                role="status"
                aria-live="polite"
                style={{ color: "var(--m-err)", fontSize: 12.5, maxWidth: 280 }}
              >
                {saveError}
              </div>
            )}
            <MetralyButton
              type="button"
              variant="primary"
              onClick={() => {
                if (step === steps.length - 1) {
                  void handleSave();
                  return;
                }
                setStep(step + 1);
              }}
              disabled={!canContinue || isSaving}
              loading={isSaving}
            >
              {step === steps.length - 1 ? "Save Dashboard" : "Continue"}
            </MetralyButton>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        <WizardPreviewGrid />
      </div>
    </div>
  );
};
