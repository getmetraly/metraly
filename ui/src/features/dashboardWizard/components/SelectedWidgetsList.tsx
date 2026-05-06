// src/features/dashboardWizard/components/SelectedWidgetsList.tsx
import React from 'react';
import { useWizardStore } from '../store/wizardStore';
import { MiniWidget } from './MiniWidget';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableWidget: React.FC<{ widget: { instanceId: string; label: string; icon: string; color: string }; onRemove: (id: string) => void }> = ({ widget, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.instanceId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={{ ...style, marginBottom: 8 }} {...attributes} {...listeners}>
      <MiniWidget widget={widget} onRemove={onRemove} />
    </div>
  );
};

export const SelectedWidgetsList: React.FC = () => {
  const { widgets, removeWidget, setWidgets } = useWizardStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex(w => w.instanceId === active.id);
      const newIndex = widgets.findIndex(w => w.instanceId === over.id);
      const newWidgets = [...widgets];
      const [moved] = newWidgets.splice(oldIndex, 1);
      newWidgets.splice(newIndex, 0, moved);
      setWidgets(newWidgets);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const widgetId = e.dataTransfer.getData('widgetId');
    if (widgetId) {
      useWizardStore.getState().addWidget(widgetId);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          minHeight: 200,
          background: 'rgba(0,0,0,0.15)',
          border: '2px dashed var(--border)',
          borderRadius: 12,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          transition: 'border-color 0.15s',
        }}
        onDragEnter={(e) => e.currentTarget.style.borderColor = 'var(--cyan)'}
        onDragLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        {widgets.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Drop widgets here or click to add</div>
        ) : (
          <SortableContext items={widgets.map(w => w.instanceId)} strategy={verticalListSortingStrategy}>
            {widgets.map(w => (
              <SortableWidget key={w.instanceId} widget={w} onRemove={() => removeWidget(w.instanceId)} />
            ))}
          </SortableContext>
        )}
      </div>
    </DndContext>
  );
};
