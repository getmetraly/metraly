import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WidgetPreviewCard } from './WidgetPreviewCard';
import { useWizardStore } from '../store/wizardStore';

describe('WidgetPreviewCard', () => {
  const mockWidget = {
    id: 'deploy-freq',
    instanceId: 'test-123',
    type: 'deploy-freq',
    label: 'Deploy Frequency',
    icon: 'zap',
    color: 'var(--m-cyan-500)',
  };

  beforeEach(() => {
    useWizardStore.getState().setTemplate('blank');
  });

  it('renders widget label and icon', () => {
    render(<WidgetPreviewCard widget={mockWidget} />);
    expect(screen.getAllByText('Deploy Frequency').length).toBeGreaterThanOrEqual(1);
  });

  it('shows toggle size button', () => {
    render(<WidgetPreviewCard widget={mockWidget} />);
    expect(screen.getByLabelText('Switch to full width')).toBeInTheDocument();
  });

  it('calls toggleWidgetSize when size button clicked', () => {
    useWizardStore.getState().addWidget('deploy-freq');
    const addedWidget = useWizardStore.getState().widgets[0];
    const testWidget = { ...mockWidget, instanceId: addedWidget.instanceId };
    render(<WidgetPreviewCard widget={testWidget} />);
    const toggleBtn = screen.getByLabelText('Switch to full width');
    fireEvent.click(toggleBtn);
    const layout = useWizardStore.getState().layout.find(l => l.i === testWidget.instanceId);
    expect(layout?.w).toBe(12);
  });

  it('calls removeWidget when remove button clicked', () => {
    useWizardStore.getState().addWidget('deploy-freq');
    const addedWidget = useWizardStore.getState().widgets[0];
    const testWidget = { ...mockWidget, instanceId: addedWidget.instanceId };
    render(<WidgetPreviewCard widget={testWidget} />);
    const removeBtn = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(removeBtn);
    expect(useWizardStore.getState().widgets).toHaveLength(0);
  });
});
