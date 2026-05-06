# DashboardWizard Edit Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate DashboardWizard components (widgets picker + settings) into DashboardScreen edit mode via a sidebar overlay with pin/unpin, empty widget support, and render consistency.

**Architecture:** Extract UI from DashboardWizardScreen into reusable WizardWidgetPicker and WizardSettings components, render inside WizardSidebar with Segmented Control, integrate into DashboardScreen, ensure DraggableDashboardRenderer and DashboardRenderer look identical.

**Tech Stack:** React, TypeScript, react-grid-layout

---

## File Structure

- **Create:** `ui/src/features/dashboardWizard/components/WizardWidgetPicker.tsx` - Widget selection panel
- **Create:** `ui/src/features/dashboardWizard/components/WizardSettings.tsx` - Settings panel with Delete
- **Create:** `ui/src/features/dashboardWizard/components/WizardSidebar.tsx` - Sidebar wrapper with pin/tabs
- **Modify:** `ui/src/features/dashboard/DashboardScreen.tsx` - Add sidebar integration
- **Modify:** `ui/src/components/dashboard/DraggableDashboardRenderer.tsx` - Ensure render consistency
- **Modify:** `ui/src/components/dashboard/DashboardRenderer.tsx` - Handle empty widget transparency
- **Modify:** `ui/src/features/dashboardWizard/store/wizardStore.ts` - Add empty widget to library
- **Modify:** `ui/src/types/dashboard.ts` - Add EmptyWidget type

---

## Task 1: Add Empty Widget to Widget Library

**Files:**
- Modify: `ui/src/features/dashboardWizard/store/wizardStore.ts`
- Modify: `ui/src/types/dashboard.ts`

- [ ] **Step 1: Add EmptyWidget type**

Open `ui/src/types/dashboard.ts` and add:

```typescript
export interface EmptyWidget {
  type: 'empty';
  instanceId: string;
}
```

- [ ] **Step 2: Add empty widget to WIDGET_LIBRARY**

Open `ui/src/features/dashboardWizard/store/wizardStore.ts`, find `WIDGET_LIBRARY` array and add:

```typescript
{
  id: 'empty',
  label: 'Empty Space',
  desc: 'Transparent spacer for layout flexibility',
  icon: 'square',
  cat: 'Team',
  defaultSize: { w: 3, h: 2 },
},
```

- [ ] **Step 3: Commit**

```bash
git add ui/src/types/dashboard.ts ui/src/features/dashboardWizard/store/wizardStore.ts
git commit -m "feat: add empty widget to library"
```

---

## Task 2: Create WizardWidgetPicker Component

**Files:**
- Create: `ui/src/features/dashboardWizard/components/WizardWidgetPicker.tsx`

- [ ] **Step 1: Create WizardWidgetPicker.tsx**

Create file with content extracted from DashboardWizardScreen lines 131-175 (step 2):

```tsx
import React from 'react';
import { Icon } from '../../components/shared/Icon';
import { WIDGET_LIBRARY } from '../store/wizardStore';

interface Widget {
  id: string;
  instanceId: string;
  label: string;
  cat: string;
  color: string;
  icon: string;
}

interface WizardWidgetPickerProps {
  selectedWidgets: Widget[];
  onToggleWidget: (widgetId: string) => void;
  onToggleSize: (instanceId: string) => void;
  onMoveWidget: (fromIndex: number, toIndex: number) => void;
  widgetSizes: Record<string, string>;
}

const CATS = ['All', 'DORA', 'CI/CD', 'PR', 'Sprint', 'Team', 'AI'];

const getCatColor = (cat: string): string => {
  const colors: Record<string, string> = { DORA: '#00E5FF', 'CI/CD': '#00C853', PR: '#B44CFF', Sprint: '#FF9100', Team: '#00E5FF', AI: '#B44CFF' };
  return colors[cat] || '#00E5FF';
};

export const WizardWidgetPicker: React.FC<WizardWidgetPickerProps> = ({
  selectedWidgets,
  onToggleWidget,
  onToggleSize,
  onMoveWidget,
  widgetSizes,
}) => {
  const [widgetCat, setWidgetCat] = React.useState<string>('All');

  const filteredWidgets = widgetCat === 'All'
    ? WIDGET_LIBRARY
    : WIDGET_LIBRARY.filter(w => w.cat === widgetCat);

  const toggleWidget = (widgetId: string) => {
    const exists = selectedWidgets.find(w => w.id === widgetId);
    if (exists) {
      onToggleWidget(exists.instanceId);
    } else {
      onToggleWidget(widgetId);
    }
  };

  return (
    <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'auto' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Customize widgets</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Add or remove widgets. Selected: {selectedWidgets.length}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setWidgetCat(c)} style={{
              padding: '4px 11px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              border: widgetCat === c ? '1px solid rgba(0,229,255,0.4)' : '1px solid var(--border)',
              background: widgetCat === c ? 'rgba(0,229,255,0.1)' : 'transparent',
              color: widgetCat === c ? 'var(--cyan)' : 'var(--muted2)',
            }}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {filteredWidgets.map(w => {
          const sel = selectedWidgets.some(x => x.id === w.id);
          const c = getCatColor(w.cat);
          return (
            <div key={w.id} onClick={() => toggleWidget(w.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9,
              cursor: 'pointer', border: sel ? `1px solid ${c}40` : '1px solid var(--border)',
              background: sel ? `${c}0a` : 'transparent',
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${c}18`, border: `1px solid ${c}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={w.icon} size={13} color={c} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{w.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{w.desc}</div>
              </div>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: sel ? 'none' : '1.5px solid var(--border)',
                background: sel ? c : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {sel && <Icon name="check" size={10} color="#0B0F19" />}
              </div>
            </div>
          );
        })}
      </div>

      {selectedWidgets.length > 0 && (
        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
            Widget layout — drag to reorder, toggle width
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedWidgets.map((w, idx) => {
              const c = getCatColor(w.cat);
              const isLg = widgetSizes[w.instanceId] === 'full';
              const isEmpty = w.id === 'empty';
              return (
                <div key={w.instanceId} style={{ 
                  display: 'flex', alignItems: 'center', gap: 8, 
                  background: isEmpty ? 'rgba(0,229,255,0.05)' : 'rgba(255,255,255,0.03)', 
                  border: isEmpty ? '1px dashed var(--cyan)' : '1px solid var(--border)', 
                  borderRadius: 9, padding: '8px 10px' 
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <button onClick={() => onMoveWidget(idx, idx - 1)} disabled={idx === 0} style={{
                      background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer',
                      color: idx === 0 ? 'var(--border)' : 'var(--muted)', padding: '1px 3px', fontSize: 10,
                    }}>▲</button>
                    <button onClick={() => onMoveWidget(idx, idx + 1)} disabled={idx === selectedWidgets.length - 1} style={{
                      background: 'none', border: 'none', cursor: idx === selectedWidgets.length - 1 ? 'default' : 'pointer',
                      color: idx === selectedWidgets.length - 1 ? 'var(--border)' : 'var(--muted)', padding: '1px 3px', fontSize: 10,
                    }}>▼</button>
                  </div>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: isEmpty ? 'rgba(0,229,255,0.1)' : `${w.color}18`, border: `1px solid ${isEmpty ? 'var(--cyan)' : w.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={w.icon} size={12} color={isEmpty ? 'var(--cyan)' : w.color} />
                  </div>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{w.label}</div>
                  {!isEmpty && (
                    <button onClick={() => onToggleSize(w.instanceId)} style={{
                      padding: '3px 8px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                      border: `1px solid ${isLg ? 'rgba(0,229,255,0.3)' : 'var(--border)'}`,
                      background: isLg ? 'rgba(0,229,255,0.08)' : 'transparent',
                      color: isLg ? 'var(--cyan)' : 'var(--muted)',
                    }}>{isLg ? 'Full' : 'Flex'}</button>
                  )}
                  <button onClick={() => onToggleWidget(w.instanceId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                    <Icon name="x" size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/features/dashboardWizard/components/WizardWidgetPicker.tsx
git commit -m "feat: create WizardWidgetPicker component"
```

---

## Task 3: Create WizardSettings Component

**Files:**
- Create: `ui/src/features/dashboardWizard/components/WizardSettings.tsx`

- [ ] **Step 1: Create WizardSettings.tsx**

Create file with content extracted from DashboardWizardScreen lines 177-216 (step 3) plus Delete button:

```tsx
import React from 'react';
import { Icon } from '../../components/shared/Icon';

interface WizardSettingsProps {
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
}) => {
  return (
    <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Dashboard settings</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Name it, configure defaults, and arrange widgets.</div>
      </div>

      <div>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Dashboard name *</label>
        <input value={name} onChange={e => onNameChange(e.target.value)} placeholder="e.g. Backend Team Overview" style={{
          width: '100%', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 9,
          padding: '9px 12px', color: 'var(--text)', fontSize: 13.5, outline: 'none',
        }} />
      </div>

      <div>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Description</label>
        <input value={desc} onChange={e => onDescChange(e.target.value)} placeholder="Optional — visible to teammates" style={{
          width: '100%', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 9,
          padding: '9px 12px', color: 'var(--text)', fontSize: 13.5, outline: 'none',
        }} />
      </div>

      <div>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Default time range</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {['7d', '14d', '30d', '90d'].map(t => (
            <button key={t} onClick={() => onTimeRangeChange(t)} style={{
              padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13,
              border: timeRange === t ? '1px solid rgba(0,229,255,0.4)' : '1px solid var(--border)',
              background: timeRange === t ? 'rgba(0,229,255,0.1)' : 'transparent',
              color: timeRange === t ? 'var(--cyan)' : 'var(--muted2)',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Team scope</label>
        <select value={team} onChange={e => onTeamChange(e.target.value)} style={{
          width: '100%', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 9,
          padding: '9px 12px', color: 'var(--text)', fontSize: 13.5, cursor: 'pointer',
        }}>
          {['All teams', 'Platform', 'Backend', 'Frontend', 'Mobile', 'Data'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Danger Zone</div>
        <button onClick={onDelete} style={{
          width: '100%', padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(255, 82, 82, 0.1)', border: '1px solid rgba(255, 82, 82, 0.3)',
          color: '#FF5252', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon name="trash" size={14} /> Delete Dashboard
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/features/dashboardWizard/components/WizardSettings.tsx
git commit -m "feat: create WizardSettings component with delete"
```

---

## Task 4: Create WizardSidebar Component

**Files:**
- Create: `ui/src/features/dashboardWizard/components/WizardSidebar.tsx`

- [ ] **Step 1: Create WizardSidebar.tsx**

```tsx
import React, { useState } from 'react';
import { Icon } from '../../components/shared/Icon';
import { WizardWidgetPicker } from './WizardWidgetPicker';
import { WizardSettings } from './WizardSettings';

interface Widget {
  id: string;
  instanceId: string;
  label: string;
  cat: string;
  color: string;
  icon: string;
}

interface WizardSidebarProps {
  isOpen: boolean;
  isPinned: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  selectedWidgets: Widget[];
  widgetSizes: Record<string, string>;
  onToggleWidget: (instanceId: string) => void;
  onToggleSize: (instanceId: string) => void;
  onMoveWidget: (fromIndex: number, toIndex: number) => void;
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
  const [activeTab, setActiveTab] = useState<'widgets' | 'settings'>('widgets');

  if (!isOpen && !isPinned) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      height: '100%',
      width: 400,
      background: 'var(--glass)',
      borderLeft: '1px solid var(--border)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid var(--border)', 
        display: 'flex', 
        alignItems: 'center',
        gap: 8,
      }}>
        <button 
          onClick={onTogglePin}
          title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isPinned ? 'var(--cyan)' : 'var(--muted)',
          }}
        >
          <Icon name="pin" size={16} />
        </button>
        
        <div style={{ 
          display: 'flex', 
          background: 'var(--bg)', 
          borderRadius: 8, 
          padding: 3,
          flex: 1,
        }}>
          <button 
            onClick={() => setActiveTab('widgets')}
            style={{
              flex: 1,
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              background: activeTab === 'widgets' ? 'var(--grad)' : 'transparent',
              color: activeTab === 'widgets' ? '#fff' : 'var(--muted)',
            }}
          >
            Widgets
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            style={{
              flex: 1,
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              background: activeTab === 'settings' ? 'var(--grad)' : 'transparent',
              color: activeTab === 'settings' ? '#fff' : 'var(--muted)',
            }}
          >
            Settings
          </button>
        </div>

        {!isPinned && (
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: 'var(--muted)',
            }}
          >
            <Icon name="x" size={18} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'widgets' ? (
          <WizardWidgetPicker
            selectedWidgets={selectedWidgets}
            onToggleWidget={onToggleWidget}
            onToggleSize={onToggleSize}
            onMoveWidget={onMoveWidget}
            widgetSizes={widgetSizes}
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
          />
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/features/dashboardWizard/components/WizardSidebar.tsx
git commit -m "feat: create WizardSidebar with pin and tabs"
```

---

## Task 5: Integrate WizardSidebar into DashboardScreen

**Files:**
- Modify: `ui/src/features/dashboard/DashboardScreen.tsx`

- [ ] **Step 1: Import WizardSidebar**

Add import at top of DashboardScreen.tsx:

```tsx
import { WizardSidebar } from '../dashboardWizard/components/WizardSidebar';
```

- [ ] **Step 2: Add state for sidebar**

Add to component state:

```tsx
const [isWizardSidebarOpen, setWizardSidebarOpen] = useState(false);
const [isSidebarPinned, setSidebarPinned] = useState(false);
```

- [ ] **Step 3: Add handlers for widget management**

Add these handlers (or reuse existing):

```tsx
const handleAddWidget = useCallback((widgetId: string) => {
  const widgetLibrary = require('../dashboardWizard/store/wizardStore').WIDGET_LIBRARY;
  const widget = widgetLibrary.find((w: any) => w.id === widgetId);
  if (!widget) return;
  
  const newInstanceId = `widget-${Date.now()}`;
  const newWidget = {
    instanceId: newInstanceId,
    widgetType: widgetId,
    config: {},
    ...widget,
  };
  
  setLocalLayout((prev) => [...prev, { i: newInstanceId, x: 0, y: Infinity, w: widget.defaultSize?.w || 6, h: widget.defaultSize?.h || 4, minW: 3, minH: 2 }]);
  setWidgetSizes((prev) => ({ ...prev, [newInstanceId]: 'half' }));
}, []);
```

- [ ] **Step 4: Add local state for dashboard settings**

```tsx
const [localName, setLocalName] = useState(dashboard?.name || '');
const [localDesc, setLocalDesc] = useState(dashboard?.description || '');
const [localTimeRange, setLocalTimeRange] = useState(dashboard?.timeRange || '7d');
const [localTeam, setLocalTeam] = useState(dashboard?.team || 'All teams');
```

- [ ] **Step 5: Add WizardSidebar to render**

Add before closing `div` of return:

```tsx
<WizardSidebar
  isOpen={isWizardSidebarOpen}
  isPinned={isSidebarPinned}
  onClose={() => setWizardSidebarOpen(false)}
  onTogglePin={() => setSidebarPinned(!isSidebarPinned)}
  selectedWidgets={dashboard?.widgets || []}
  widgetSizes={widgetSizes}
  onToggleWidget={(instanceId) => {
    if (dashboard?.widgets.some((w: any) => w.instanceId === instanceId)) {
      handleRemoveWidget(instanceId);
    } else {
      const w = dashboard?.widgets.find((w: any) => w.id === instanceId);
      if (w) handleAddWidget(w.id);
    }
  }}
  onToggleSize={handleToggleSize}
  onMoveWidget={(from, to) => {
    const newWidgets = [...(dashboard?.widgets || [])];
    const [moved] = newWidgets.splice(from, 1);
    newWidgets.splice(to, 0, moved);
    // Update layout order based on new widgets order
  }}
  name={localName}
  desc={localDesc}
  timeRange={localTimeRange}
  team={localTeam}
  onNameChange={setLocalName}
  onDescChange={setLocalDesc}
  onTimeRangeChange={setLocalTimeRange}
  onTeamChange={setLocalTeam}
  onDelete={async () => {
    if (dashboard && confirm('Are you sure you want to delete this dashboard?')) {
      await mockApi.deleteDashboard(dashboard.id);
      handleDashboardChange('overview');
    }
  }}
/>
```

- [ ] **Step 6: Update Edit button to open sidebar**

Change the "Edit Layout" button behavior:

```tsx
<button
  onClick={() => {
    setWizardSidebarOpen(true);
    setSidebarPinned(true);
  }}
  // ... existing styles
>
  <Icon name="edit" size={13} /> Customize
</button>
```

- [ ] **Step 7: Commit**

```bash
git add ui/src/features/dashboard/DashboardScreen.tsx
git commit -m "feat: integrate WizardSidebar into DashboardScreen"
```

---

## Task 6: Ensure Render Consistency (Draggable vs Normal)

**Files:**
- Modify: `ui/src/components/dashboard/DraggableDashboardRenderer.tsx`
- Modify: `ui/src/components/dashboard/DashboardRenderer.tsx`

- [ ] **Step 1: Check DraggableDashboardRenderer for empty widget handling**

Open `DraggableDashboardRenderer.tsx` and ensure empty widgets are rendered during edit:

```tsx
// In render function, check widget type
const isEmpty = widget.widgetType === 'empty';
return (
  <div style={{
    width: '100%',
    height: '100%',
    background: isEditMode && isEmpty ? 'rgba(0,229,255,0.03)' : 'transparent',
    border: isEditMode && isEmpty ? '1px dashed var(--cyan)' : 'none',
    borderRadius: 8,
  }}>
    {/* Render widget content only if not empty in edit mode */}
    {!isEmpty && <WidgetRenderer ... />}
  </div>
);
```

- [ ] **Step 2: Update DashboardRenderer for empty widget transparency**

Open `DashboardRenderer.tsx` and add:

```tsx
const isEmpty = widget.widgetType === 'empty';

// In the render loop:
if (isEmpty) return null; // Or use visibility: hidden for grid spacing
```

- [ ] **Step 3: Commit**

```bash
git add ui/src/components/dashboard/DraggableDashboardRenderer.tsx ui/src/components/dashboard/DashboardRenderer.tsx
git commit -m "feat: ensure render consistency for empty widgets"
```

---

## Task 7: Verify and Test

**Files:**
- Run: Development server and manual testing

- [ ] **Step 1: Run lint/typecheck**

```bash
cd ui && npm run typecheck 2>&1 | head -50
```

- [ ] **Step 2: Test flow**

1. Open any dashboard
2. Click "Customize" button
3. Verify sidebar opens with Segmented Control
4. Test Pin/Unpin functionality
5. Switch between Widgets and Settings tabs
6. Add/remove widgets
7. Verify empty widget appears with dashed border in edit mode
8. Toggle edit mode off and verify empty widgets are invisible
9. Test Save functionality
10. Test Delete button (create test dashboard first)

- [ ] **Step 3: Commit any fixes**

```bash
git add . && git commit -m "fix: address issues from testing"
```

---

## Task 8: Final Commit

- [ ] **Step 1: Review all changes**

```bash
git log --oneline -10
```

- [ ] **Step 2: Final commit with all changes**

```bash
git add . && git commit -m "feat: complete DashboardWizard edit integration"
```