import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline, type SparkPoint } from '@/components/shared/Sparkline';

const weekPoints: SparkPoint[] = [
  { status: 'success', height: 0.2 },
  { status: 'success', height: 0.6 },
  { status: 'warning', height: 0.4 },
  { status: 'success', height: 0.9 },
  { status: 'danger', height: 0.3 },
  { status: 'success', height: 0.7 },
  { status: 'success', height: 1 },
];

describe('Sparkline', () => {
  it('renders one bar per point', () => {
    const { container } = render(<Sparkline points={weekPoints} />);
    expect(container.querySelectorAll('i').length).toBe(weekPoints.length);
  });

  it('clamps height between 0 and 1 and scales to a max of 18px', () => {
    const { container } = render(
      <Sparkline
        points={[
          { status: 'blue', height: 0 },
          { status: 'blue', height: 1 },
          { status: 'blue', height: 2 },
          { status: 'blue', height: -1 },
        ]}
      />
    );
    const bars = Array.from(container.querySelectorAll('i')) as HTMLElement[];
    expect(bars[0].style.height).toBe('1px');
    expect(bars[1].style.height).toBe('18px');
    expect(bars[2].style.height).toBe('18px');
    expect(bars[3].style.height).toBe('1px');
  });

  it('applies the matching semantic color class per bar', () => {
    const { container } = render(<Sparkline points={weekPoints} />);
    const bars = Array.from(container.querySelectorAll('i')) as HTMLElement[];
    expect(bars[0].className).toContain('bg-success');
    expect(bars[2].className).toContain('bg-warning');
    expect(bars[4].className).toContain('bg-danger');
  });
});
