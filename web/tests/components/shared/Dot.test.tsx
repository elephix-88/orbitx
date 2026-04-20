import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Dot } from '@/components/shared/Dot';

describe('Dot', () => {
  it('renders an 8px round span', () => {
    const { container } = render(<Dot variant="success" data-testid="dot" />);
    const el = container.querySelector('span');
    expect(el).not.toBeNull();
    expect(el!.className).toContain('w-2');
    expect(el!.className).toContain('h-2');
    expect(el!.className).toContain('rounded-full');
  });

  it.each(['success', 'warning', 'danger', 'blue', 'muted'] as const)(
    'renders %s variant',
    (variant) => {
      const { container } = render(<Dot variant={variant} />);
      const el = container.querySelector('span')!;
      const expected = variant === 'blue' ? 'bg-blue-primary' : variant === 'muted' ? 'bg-text-4' : `bg-${variant}`;
      expect(el.className).toContain(expected);
    }
  );

  it('applies pulse-ring class when pulseRing is true', () => {
    const { container } = render(<Dot variant="blue" pulseRing />);
    expect(container.querySelector('span')!.className).toContain('pulse-ring');
  });

  it('does not apply pulse-ring class by default', () => {
    const { container } = render(<Dot variant="blue" />);
    expect(container.querySelector('span')!.className).not.toContain('pulse-ring');
  });
});
