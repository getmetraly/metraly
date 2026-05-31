// src/features/dashboardWizard/components/WizardSettings.tsx
import React from 'react';
import { Icon, MetralyInput, MetralySelect, MetralySegmentedControl } from '../../../design-system';
import type { MetralySelectOption } from '../../../design-system';
import { WizardWidget } from '../store/wizardStore';

export interface WizardSettingsProps {
  name: string;
  desc: string;
  timeRange: string;
  team: string;
  onNameChange: (name: string) => void;
  onDescChange: (desc: string) => void;
  onTimeRangeChange: (range: string) => void;
  onTeamChange: (team: string) => void;
  onDelete: () => void;
  selectedWidgets: WizardWidget[];
  widgetSizes: Record<string, string>;
  onToggleWidget: (instanceId: string) => void;
  onToggleSize: (instanceId: string) => void;
  onMoveWidget: (fromIndex: number, toIndex: number) => void;
  showDefaultFilters?: boolean;
  showDelete?: boolean;
}

const getCatColor = (cat: string): string => {
  const colors: Record<string, string> = { DORA: '#00E5FF', 'CI/CD': '#00C853', PR: '#B44CFF', Sprint: '#FF9100', Team: '#00E5FF', AI: '#B44CFF' };
  return colors[cat] || '#00E5FF';
};

const teamOptions: MetralySelectOption[] = ['All teams', 'Platform', 'Backend', 'Frontend', 'Mobile', 'Data'].map((t) => ({ value: t, label: t }));
const timeRangeOptions = ['7d', '14d', '30d', '90d'].map((t) => ({ value: t, label: t }));

export const WizardSettings: React.FC<WizardSettingsProps> = ({
  name,
  desc,
  timeRange,
  team,
  onNameChange,
  onDescChange,
  onTimeRangeChange,
  onTeamChange,
  onDelete,
  selectedWidgets,
  widgetSizes,
  onToggleWidget,
  onToggleSize,
  onMoveWidget,
  showDefaultFilters = true,
  showDelete = false,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Dashboard settings</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Name it, configure defaults.</div>
      </div>

      <div>
        <label htmlFor="dashboard-settings-name" style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Dashboard name *</label>
        <MetralyInput
          id="dashboard-settings-name"
          name="dashboard-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoComplete="off"
          placeholder="e.g. Backend Team Overview…"
          fullWidth
        />
      </div>

      <div>
        <label htmlFor="dashboard-settings-description" style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Description</label>
        <MetralyInput
          id="dashboard-settings-description"
          name="dashboard-description"
          value={desc}
          onChange={(e) => onDescChange(e.target.value)}
          autoComplete="off"
          placeholder="Optional - visible to teammates…"
          fullWidth
        />
      </div>

      {showDefaultFilters && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Default time range</div>
          <MetralySegmentedControl
            options={timeRangeOptions}
            value={timeRange}
            onChange={onTimeRangeChange}
            size="sm"
            ariaLabel="Default time range"
          />
        </div>
      )}

      {showDefaultFilters && (
        <div>
          <label htmlFor="dashboard-settings-team" style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Team scope</label>
          <MetralySelect
            id="dashboard-settings-team"
            name="dashboard-team"
            value={team}
            options={teamOptions}
            onChange={onTeamChange}
          />
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text)' }}>
          Selected Widgets ({selectedWidgets.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {selectedWidgets.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 16, fontSize: 12 }}>
              No widgets selected
            </div>
          ) : (
            selectedWidgets.map((widget, index) => {
              const isEmpty = widget.id === 'empty';
              const size = widgetSizes[widget.instanceId] || 'half';
              const c = getCatColor(widget.cat);

              return (
                <div key={widget.instanceId} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                  border: isEmpty ? '1.5px dashed var(--cyan)' : '1px solid var(--border)',
                  background: isEmpty ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.03)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <button
                      type="button"
                      aria-label={`Move ${widget.label} up`}
                      onClick={() => onMoveWidget(index, index - 1)}
                      disabled={index === 0}
                      style={{
                        background: 'none', border: 'none', padding: 2, cursor: index === 0 ? 'not-allowed' : 'pointer',
                        color: index === 0 ? 'var(--border)' : 'var(--text)',
                        opacity: index === 0 ? 0.3 : 1,
                      }}
                    >
                      <Icon name="chevronUp" size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${widget.label} down`}
                      onClick={() => onMoveWidget(index, index + 1)}
                      disabled={index === selectedWidgets.length - 1}
                      style={{
                        background: 'none', border: 'none', padding: 2, cursor: index === selectedWidgets.length - 1 ? 'not-allowed' : 'pointer',
                        color: index === selectedWidgets.length - 1 ? 'var(--border)' : 'var(--text)',
                        opacity: index === selectedWidgets.length - 1 ? 0.3 : 1,
                      }}
                    >
                      <Icon name="chevronDown" size={14} />
                    </button>
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: isEmpty ? 'rgba(0,229,255,0.15)' : `${c}18`, border: `1px solid ${isEmpty ? 'var(--cyan)' : c}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={widget.icon} size={14} color={isEmpty ? 'var(--cyan)' : c} />
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{widget.label}</div>
                  {!isEmpty && (
                    <button
                      type="button"
                      aria-label={size === 'full' ? `Make ${widget.label} flexible width` : `Make ${widget.label} full width`}
                      onClick={() => onToggleSize(widget.instanceId)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: 'pointer',
                        border: size === 'full' ? '1px solid rgba(0,229,255,0.4)' : '1px solid var(--border)',
                        background: size === 'full' ? 'rgba(0,229,255,0.15)' : 'transparent',
                        color: size === 'full' ? 'var(--cyan)' : 'var(--muted2)',
                      }}
                    >
                      {size === 'full' ? 'Full' : 'Flex'}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${widget.label}`}
                    onClick={() => onToggleWidget(widget.instanceId)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', padding: 4, flexShrink: 0 }}
                  >
                    <Icon name="x" size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {showDelete && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,82,82,0.9)', marginBottom: 8, fontWeight: 600 }}>Danger Zone</div>
          <button
            type="button"
            onClick={onDelete}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              border: '1px solid rgba(255,82,82,0.3)',
              background: 'rgba(255,82,82,0.1)',
              color: '#FF5252',
            }}
          >
            <Icon name="trash" size={14} />
            Delete Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
