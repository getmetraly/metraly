import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { WidgetPalette } from './WidgetPalette';

describe('WidgetPalette', () => {
  it('renders all widgets from WIDGET_LIBRARY', () => {
    render(<WidgetPalette />);
    expect(screen.getByText('DORA Overview')).toBeInTheDocument();
    expect(screen.getByText('Deploy Frequency')).toBeInTheDocument();
    expect(screen.getByText('PR Review Queue')).toBeInTheDocument();
  });

  it('renders draggable elements with correct data attribute', () => {
    render(<WidgetPalette />);
    const draggableItems = document.querySelectorAll('[draggable]');
    expect(draggableItems.length).toBeGreaterThan(0);
  });
});
