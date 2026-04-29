import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '@/components/shared/FilterBar';

describe('FilterBar', () => {
  it('renders the search shell and filter pills', () => {
    render(
      <FilterBar
        search={{ placeholder: 'Search pipelines…', value: '', onChange: () => {} }}
        filters={[
          { label: 'Status', value: 'All', options: ['All', 'Healthy'], onSelect: () => {} },
          { label: 'Source', value: 'Any', options: ['Any', 'Facebook'], onSelect: () => {} },
        ]}
      />
    );
    expect(screen.getByPlaceholderText('Search pipelines…')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('Source:')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Any')).toBeInTheDocument();
  });

  it('calls search onChange on input', () => {
    const onChange = vi.fn();
    render(
      <FilterBar
        search={{ placeholder: 'Search', value: '', onChange }}
        filters={[]}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('Search'), {
      target: { value: 'fb' },
    });
    expect(onChange).toHaveBeenCalledWith('fb');
  });

  it('cycles filter pill value on click', () => {
    const onSelect = vi.fn();
    render(
      <FilterBar
        search={{ placeholder: 'Search', value: '', onChange: () => {} }}
        filters={[
          {
            label: 'Status',
            value: 'All',
            options: ['All', 'Healthy', 'Failed'],
            onSelect,
          },
        ]}
      />
    );
    fireEvent.click(screen.getByText('Status:').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('Healthy');
  });

  it('renders groupBy and viewToggle segmented controls when provided', () => {
    render(
      <FilterBar
        search={{ placeholder: 'Search', value: '', onChange: () => {} }}
        filters={[]}
        groupBy={{
          options: [
            { value: 'none', label: 'None' },
            { value: 'client', label: 'Client' },
          ],
          value: 'none',
          onChange: () => {},
        }}
        viewToggle={{
          options: [
            { value: 'table', label: 'Table' },
            { value: 'grid', label: 'Grid' },
          ],
          value: 'table',
          onChange: () => {},
        }}
      />
    );
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
  });
});
