import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MiniWidget } from './MiniWidget';

describe('MiniWidget', () => {
  const mockWidget = {
    id: 'deploy-freq',
    instanceId: 'test-123',
    type: 'deploy-freq',
    label: 'Deploy Frequency',
    icon: 'zap',
    color: '#00E5FF',
  };

  it('renders widget label and icon', () => {
    render(<MiniWidget widget={mockWidget} onRemove={() => {}} />);
    expect(screen.getByText('Deploy Frequency')).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked', () => {
    const onRemove = vi.fn();
    const { container } = render(<MiniWidget widget={mockWidget} onRemove={onRemove} />);
    const removeBtn = within(container).getByRole('button');
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith('test-123');
  });
});