import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppSidebar } from './AppSidebar';

vi.mock('../hooks/AppBootstrapContext', () => ({
  useAppBootstrap: () => ({
    dashboards: [
      { id: 'sandbox-all-widgets', name: 'Demo', icon: 'sparkles' },
    ],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

describe('AppSidebar', () => {
  it('does not render nested button elements', () => {
    const { container } = render(<AppSidebar active="sandbox-all-widgets" onNav={() => {}} />);
    expect(container.querySelector('button button')).toBeNull();
  });

  it('pin click does not trigger navigation', () => {
    const onNav = vi.fn();
    render(<AppSidebar active="sandbox-all-widgets" onNav={onNav} />);
    fireEvent.click(screen.getByLabelText('Pin dashboard'));
    expect(onNav).not.toHaveBeenCalled();
  });

  it('sidebar item click triggers navigation', () => {
    const onNav = vi.fn();
    render(<AppSidebar active="" onNav={onNav} />);
    fireEvent.click(screen.getByText('Demo'));
    expect(onNav).toHaveBeenCalledWith('sandbox-all-widgets');
  });
});
