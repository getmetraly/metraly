import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectedWidgetsList } from './SelectedWidgetsList';
import { useWizardStore } from '../store/wizardStore';

describe('SelectedWidgetsList', () => {
  beforeEach(() => {
    useWizardStore.getState().setTemplate('blank');
  });

  it('shows empty state when no widgets selected', () => {
    render(<SelectedWidgetsList />);
     expect(screen.getByText('Drop widgets here or click to add')).toBeInTheDocument();
  });

  it('renders selected widgets', () => {
    useWizardStore.getState().addWidget('deploy-freq');
    render(<SelectedWidgetsList />);
    expect(screen.getByText('Deploy Frequency')).toBeInTheDocument();
  });

  it('removes widget when MiniWidget remove clicked', () => {
    useWizardStore.getState().addWidget('deploy-freq');
    render(<SelectedWidgetsList />);
     const removeBtn = screen.getAllByRole('button')[1];
    fireEvent.click(removeBtn);
    expect(useWizardStore.getState().widgets).toHaveLength(0);
  });
});
