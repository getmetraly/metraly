import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardWizardScreen } from './DashboardWizardScreen';
import { useWizardStore } from './store/wizardStore';

// Mock ResizeObserver for react-grid-layout
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

describe('DashboardWizardScreen', () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
  });

  it('renders template selection on step 0', () => {
    render(<DashboardWizardScreen />);
    expect(screen.getByText('Start from a template')).toBeInTheDocument();
    expect(screen.getByText('CTO')).toBeInTheDocument();
  });

  it('selects template and moves to step 1', () => {
    render(<DashboardWizardScreen />);
    fireEvent.click(screen.getByText('CTO'));
    const continueBtn = screen.getByText('Continue');
    fireEvent.click(continueBtn);
    expect(screen.getByText('Customize widgets')).toBeInTheDocument();
  });

  it('shows category filter and widgets on step 1', () => {
    render(<DashboardWizardScreen />);
    fireEvent.click(screen.getByText('CTO'));
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('DORA')).toBeInTheDocument();
    expect(screen.getByText('CI/CD')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Selected:'))).toBeInTheDocument();
  });

  it('toggles widget selection on step 1', () => {
    render(<DashboardWizardScreen />);
    fireEvent.click(screen.getByText('CTO'));
    fireEvent.click(screen.getByText('Continue'));
    const widgetText = 'DORA Overview';
    fireEvent.click(screen.getByText(widgetText));
    expect(screen.getByText((content) => content.includes('Selected:'))).toHaveTextContent('Selected: 5');
  });

  it('moves to step 2 and shows widget layout management', () => {
    render(<DashboardWizardScreen />);
    fireEvent.click(screen.getByText('CTO'));
    fireEvent.click(screen.getByText('Continue'));
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Dashboard settings')).toBeInTheDocument();
    expect(screen.getByText('Widget layout — drag to reorder, toggle width')).toBeInTheDocument();
  });
});
