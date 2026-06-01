// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

// src/features/dashboardWizard/components/WizardSidebar.tsx
import React from 'react';
import { Icon, MetralySegmentedControl } from '../../../design-system';
import { WizardWidgetPicker } from './WizardWidgetPicker';
import { WizardSettings } from './WizardSettings';
import { WizardWidget } from '../store/wizardStore';

interface WizardSidebarProps {
  isOpen: boolean;
  isPinned: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  selectedWidgets: WizardWidget[];
  widgetSizes: Record<string, string>;
  onToggleWidget: (instanceId: string) => void;
  onToggleSize: (instanceId: string) => void;
  onMoveWidget: (fromIndex: number, toIndex: number) => void;
  showDefaultFilters?: boolean;
  showDelete?: boolean;
  name: string;
  desc: string;
  timeRange: string;
  team: string;
  onNameChange: (name: string) => void;
  onDescChange: (desc: string) => void;
  onTimeRangeChange: (range: string) => void;
  onTeamChange: (team: string) => void;
  onDelete: () => void;
}

export const WizardSidebar: React.FC<WizardSidebarProps> = ({
  isOpen,
  isPinned,
  onClose,
  onTogglePin,
  selectedWidgets,
  widgetSizes,
  onToggleWidget,
  onToggleSize,
  onMoveWidget,
  showDefaultFilters = true,
  showDelete = false,
  name,
  desc,
  timeRange,
  team,
  onNameChange,
  onDescChange,
  onTimeRangeChange,
  onTeamChange,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = React.useState<'widgets' | 'settings'>('widgets');

  if (!isOpen) return null;

  return (
    <div style={{
      width: 400,
      height: '100%',
      flexShrink: 0,
      background: 'var(--m-bg-1)',
      borderLeft: '1px solid var(--m-line)',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: 28,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--m-line)',
      }}>
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="pin" size={18} color={isPinned ? 'var(--m-cyan-500)' : 'var(--m-fg-2)'} />
        </button>

        <MetralySegmentedControl
          options={[
            { value: 'widgets', label: 'Widgets' },
            { value: 'settings', label: 'Settings' },
          ]}
          value={activeTab}
          onChange={(v) => setActiveTab(v as 'widgets' | 'settings')}
          size="sm"
          ariaLabel="Sidebar tabs"
        />

        {!isPinned && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="x" size={18} color="var(--m-fg-2)" />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {activeTab === 'widgets' ? (
          <WizardWidgetPicker
            selectedWidgets={selectedWidgets}
            widgetSizes={widgetSizes}
            onToggleWidget={onToggleWidget}
            onToggleSize={onToggleSize}
            onMoveWidget={onMoveWidget}
          />
        ) : (
          <WizardSettings
            name={name}
            desc={desc}
            timeRange={timeRange}
            team={team}
            onNameChange={onNameChange}
            onDescChange={onDescChange}
            onTimeRangeChange={onTimeRangeChange}
            onTeamChange={onTeamChange}
            onDelete={onDelete}
            showDefaultFilters={showDefaultFilters}
            showDelete={showDelete}
            selectedWidgets={selectedWidgets}
            widgetSizes={widgetSizes}
            onToggleWidget={onToggleWidget}
            onToggleSize={onToggleSize}
            onMoveWidget={onMoveWidget}
          />
        )}
      </div>
    </div>
  );
};
