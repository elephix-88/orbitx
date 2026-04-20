import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedControl } from '@/components/shared/SegmentedControl';

type Range = 'today' | '7d' | '30d' | '90d';

const options = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
] satisfies { value: Range; label: string }[];

describe('SegmentedControl', () => {
  it('renders all options', () => {
    render(
      <SegmentedControl<Range>
        options={options}
        value="today"
        onChange={() => {}}
      />
    );
    for (const opt of options) {
      expect(screen.getByText(opt.label)).toBeInTheDocument();
    }
  });

  it('marks the active option with aria-checked', () => {
    render(
      <SegmentedControl<Range> options={options} value="7d" onChange={() => {}} />
    );
    const active = screen.getByRole('radio', { name: '7d' });
    expect(active).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when a new option is clicked', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl<Range> options={options} value="today" onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('radio', { name: '30d' }));
    expect(onChange).toHaveBeenCalledWith('30d');
  });

  it('applies the active shadow-sm class to the selected option', () => {
    render(
      <SegmentedControl<Range> options={options} value="today" onChange={() => {}} />
    );
    const active = screen.getByRole('radio', { name: 'Today' });
    expect(active.className).toContain('shadow-sm');
  });
});
