import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from '@/components/shared/Tabs';

const items = [
  { id: 'all', label: 'All', count: 247 },
  { id: 'attention', label: 'Needs attention', count: 8 },
  { id: 'running', label: 'Running', count: 12 },
];

describe('Tabs', () => {
  it('renders every tab label', () => {
    render(<Tabs items={items} activeId="all" onChange={() => {}} />);
    for (const item of items) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it('marks the active tab with aria-selected=true', () => {
    render(<Tabs items={items} activeId="running" onChange={() => {}} />);
    const active = screen.getByRole('tab', { name: /Running/ });
    expect(active).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onChange when a non-active tab is clicked', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} activeId="all" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /Needs attention/ }));
    expect(onChange).toHaveBeenCalledWith('attention');
  });

  it('renders counts next to labels', () => {
    render(<Tabs items={items} activeId="all" onChange={() => {}} />);
    expect(screen.getByText('247')).toBeInTheDocument();
  });

  it('renders trailingAction when provided', () => {
    render(
      <Tabs
        items={items}
        activeId="all"
        onChange={() => {}}
        trailingAction={<button>+ Save view</button>}
      />
    );
    expect(screen.getByText('+ Save view')).toBeInTheDocument();
  });
});
