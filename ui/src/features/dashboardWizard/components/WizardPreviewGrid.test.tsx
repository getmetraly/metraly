import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WizardPreviewGrid } from './WizardPreviewGrid';
import { useWizardStore } from '../store/wizardStore';

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

describe('WizardPreviewGrid', () => {
  beforeEach(() => {
    useWizardStore.getState().setTemplate('blank');
  });

  it('shows empty state when no widgets', () => {
    render(<WizardPreviewGrid />);
    expect(screen.getByText('Add widgets to see a preview')).toBeInTheDocument();
  });

  it('renders widgets in grid layout', () => {
    useWizardStore.getState().addWidget('deploy-freq');
    useWizardStore.getState().addWidget('lead-time');
    render(<WizardPreviewGrid />);
    expect(screen.getAllByText('Deploy Frequency').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lead Time').length).toBeGreaterThan(0);
  });

  it('displays dashboard name in header', () => {
    useWizardStore.getState().setTemplate('cto');
    render(<WizardPreviewGrid />);
    expect(screen.getByText(/CTO Dashboard — Preview/)).toBeInTheDocument();
  });
});
