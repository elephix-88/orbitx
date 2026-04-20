import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Inbox } from 'lucide-react';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="Nothing here yet" />);
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="No runs yet." />);
    expect(screen.getByText('No runs yet.')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = render(
      <EmptyState title="Empty" icon={<Inbox data-testid="icon" />} />
    );
    expect(container.querySelector('[data-testid="icon"]')).not.toBeNull();
  });

  it('renders action slot', () => {
    render(<EmptyState title="Empty" action={<button>Refresh</button>} />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });
});
