import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatTile } from '@/components/shared/StatTile';

describe('StatTile', () => {
  it('renders label and value', () => {
    render(<StatTile label="Active pipelines" value="247" />);
    expect(screen.getByText('Active pipelines')).toBeInTheDocument();
    expect(screen.getByText('247')).toBeInTheDocument();
  });

  it('renders delta with up direction in success color', () => {
    render(
      <StatTile
        label="Successful runs"
        value="1,284"
        delta={{ direction: 'up', text: '+12 vs yesterday' }}
      />
    );
    const delta = screen.getByText(/\+12 vs yesterday/);
    expect(delta.className).toContain('text-success');
  });

  it('renders delta with down direction in danger color', () => {
    render(
      <StatTile label="Failed runs" value="11" delta={{ direction: 'down', text: '-3' }} />
    );
    const delta = screen.getByText(/-3/);
    expect(delta.className).toContain('text-danger');
  });

  it('applies font-mono class when mono prop is true', () => {
    render(<StatTile label="Rows synced" value="4.82M" mono />);
    expect(screen.getByText('4.82M').className).toContain('font-mono');
  });

  it('does not apply font-mono by default', () => {
    render(<StatTile label="Active pipelines" value="247" />);
    expect(screen.getByText('247').className).not.toContain('font-mono');
  });
});
