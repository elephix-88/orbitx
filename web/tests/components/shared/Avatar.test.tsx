import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '@/components/shared/Avatar';

describe('Avatar', () => {
  it('derives two-letter initials from full name', () => {
    render(<Avatar name="Nattha Sri" />);
    expect(screen.getByText('NS')).toBeInTheDocument();
  });

  it('uses first two characters for a single-word name', () => {
    render(<Avatar name="Acme" />);
    expect(screen.getByText('AC')).toBeInTheDocument();
  });

  it('shows a placeholder for an empty name', () => {
    render(<Avatar name="   " />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it.each(['sm', 'md'] as const)('applies %s size class', (size) => {
    render(<Avatar name="Jane Doe" size={size} />);
    const el = screen.getByText('JD');
    const expected = size === 'sm' ? 'w-[22px]' : 'w-[28px]';
    expect(el.className).toContain(expected);
  });

  it('produces stable colors for the same name (auto tone)', () => {
    const first = render(<Avatar name="Alice Wong" />);
    const firstStyle = (first.getByText('AW') as HTMLElement).getAttribute('style') ?? '';
    first.unmount();
    const second = render(<Avatar name="Alice Wong" />);
    const secondStyle = (second.getByText('AW') as HTMLElement).getAttribute('style') ?? '';
    expect(firstStyle).toBe(secondStyle);
  });

  it('uses navy tone when tone prop is navy', () => {
    render(<Avatar name="Team Lead" tone="navy" />);
    const el = screen.getByText('TL');
    expect(el.getAttribute('data-tone')).toBe('navy');
    // Text color should be white on navy, not muted text-2 like auto pastels.
    expect(el.style.color).toBe('rgb(255, 255, 255)');
  });

  it('defaults to auto tone', () => {
    render(<Avatar name="Alice Wong" />);
    expect(screen.getByText('AW').getAttribute('data-tone')).toBe('auto');
  });

  it('sets the name as aria-label', () => {
    render(<Avatar name="Bob Stone" />);
    expect(screen.getByLabelText('Bob Stone')).toBeInTheDocument();
  });
});
