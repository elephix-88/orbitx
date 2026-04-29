import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlowChip } from '@/components/shared/FlowChip';

describe('FlowChip', () => {
  it('renders source and destination', () => {
    render(<FlowChip source="Facebook Ads" destination="BigQuery" />);
    expect(screen.getByText('Facebook Ads')).toBeInTheDocument();
    expect(screen.getByText('BigQuery')).toBeInTheDocument();
  });

  it('renders an arrow SVG between source and destination', () => {
    const { container } = render(<FlowChip source="A" destination="B" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
  });

  it('supports ReactNode sources and destinations', () => {
    render(
      <FlowChip
        source={<span data-testid="src">SRC</span>}
        destination={<span data-testid="dst">DST</span>}
      />
    );
    expect(screen.getByTestId('src')).toBeInTheDocument();
    expect(screen.getByTestId('dst')).toBeInTheDocument();
  });
});
