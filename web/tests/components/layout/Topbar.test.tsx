import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Topbar } from '@/components/layout/Topbar';

const wrap = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Topbar', () => {
  it('renders a breadcrumb trail', () => {
    wrap(
      <Topbar
        breadcrumbs={[
          { label: 'Pipelines', href: '/workflows' },
          { label: 'Daily Ad Spend' },
        ]}
      />
    );
    expect(screen.getByText('Pipelines')).toBeInTheDocument();
    expect(screen.getByText('Daily Ad Spend')).toBeInTheDocument();
  });

  it('renders a plain title when no breadcrumbs', () => {
    wrap(<Topbar title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows notification count badge when count > 0', () => {
    wrap(<Topbar notificationsCount={3} />);
    expect(screen.getByLabelText(/Notifications \(3\)/)).toBeInTheDocument();
  });

  it('clamps huge counts to 99+', () => {
    wrap(<Topbar notificationsCount={250} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('renders the primary action slot', () => {
    wrap(<Topbar primaryAction={<button>+ New pipeline</button>} />);
    expect(screen.getByText('+ New pipeline')).toBeInTheDocument();
  });

  it('invokes onFeedbackClick when the Feedback button is clicked', async () => {
    const onFeedbackClick = vi.fn();
    wrap(<Topbar onFeedbackClick={onFeedbackClick} />);
    const button = screen.getByText('Feedback');
    button.click();
    expect(onFeedbackClick).toHaveBeenCalled();
  });
});
