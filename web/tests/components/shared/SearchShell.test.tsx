import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchShell } from '@/components/shared/SearchShell';

describe('SearchShell', () => {
  it('renders placeholder', () => {
    render(<SearchShell placeholder="Search pipelines…" />);
    expect(screen.getByPlaceholderText('Search pipelines…')).toBeInTheDocument();
  });

  it('calls onChange with the new value', () => {
    const onChange = vi.fn();
    render(<SearchShell placeholder="Search" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('renders kbd hint when provided', () => {
    render(<SearchShell placeholder="Search" kbdHint="⌘K" />);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('does not render kbd hint when omitted', () => {
    const { container } = render(<SearchShell placeholder="Search" />);
    expect(container.querySelector('kbd')).toBeNull();
  });

  it.each(['full', 'md', 'lg'] as const)('applies %s width class', (width) => {
    const { container } = render(<SearchShell placeholder="Search" width={width} />);
    const label = container.querySelector('label')!;
    const expected =
      width === 'full' ? 'w-full' : width === 'md' ? 'w-[240px]' : 'w-[320px]';
    expect(label.className).toContain(expected);
  });
});
