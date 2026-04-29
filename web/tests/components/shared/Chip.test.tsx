import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chip } from '@/components/shared/Chip';

describe('Chip', () => {
  it('renders children', () => {
    render(<Chip variant="success">Healthy</Chip>);
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it.each(['success', 'warning', 'danger', 'blue', 'violet', 'soft'] as const)(
    'renders %s variant with matching token classes',
    (variant) => {
      render(<Chip variant={variant}>label</Chip>);
      const chip = screen.getByText('label');
      expect(chip.className).toContain(variant === 'blue' ? 'text-blue-primary' : `text-${variant === 'soft' ? 'text-2' : variant}`);
    }
  );

  it('applies custom className', () => {
    render(
      <Chip variant="soft" className="ml-2">
        label
      </Chip>
    );
    expect(screen.getByText('label').className).toContain('ml-2');
  });

  it('forwards ref to the span element', () => {
    let captured: HTMLSpanElement | null = null;
    render(
      <Chip
        variant="soft"
        ref={(el) => {
          captured = el;
        }}
      >
        label
      </Chip>
    );
    expect(captured).toBeInstanceOf(HTMLSpanElement);
  });
});
