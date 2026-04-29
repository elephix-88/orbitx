import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIInsightCard } from '@/components/insights/AIInsightCard';
import type { AiInsight } from '@/pages/home/mockAiInsights';

const sampleInsight: AiInsight = {
  id: 'i1',
  headline: 'Meta ROAS climbed 18% this week',
  body: 'Cost-per-purchase dropped sharply.',
  category: 'Opportunity',
  primaryActionLabel: 'See analysis',
  dismissLabel: 'Dismiss',
};

describe('AIInsightCard', () => {
  it('renders headline and body when given an insight', () => {
    render(<AIInsightCard insight={sampleInsight} />);
    expect(screen.getByText(sampleInsight.headline)).toBeInTheDocument();
    expect(screen.getByText(sampleInsight.body)).toBeInTheDocument();
  });

  it('renders both primary and dismiss buttons with their labels', () => {
    render(<AIInsightCard insight={sampleInsight} />);
    expect(screen.getByText('See analysis')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('fires onPrimary / onDismiss callbacks', () => {
    const onPrimary = vi.fn();
    const onDismiss = vi.fn();
    render(
      <AIInsightCard insight={sampleInsight} onPrimary={onPrimary} onDismiss={onDismiss} />
    );
    fireEvent.click(screen.getByText('See analysis'));
    fireEvent.click(screen.getByText('Dismiss'));
    expect(onPrimary).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders loading skeleton when loading', () => {
    const { container } = render(<AIInsightCard insight={null} loading />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders an empty message when no insight', () => {
    render(<AIInsightCard insight={null} />);
    expect(screen.getByText(/No insights yet/)).toBeInTheDocument();
  });
});
