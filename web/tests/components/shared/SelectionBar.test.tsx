import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionBar } from '@/components/shared/SelectionBar';

describe('SelectionBar', () => {
  it('renders nothing when count is zero', () => {
    const { container } = render(
      <SelectionBar count={0} actions={[]} onClear={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders count and actions when count > 0', () => {
    render(
      <SelectionBar
        count={3}
        actions={[
          { label: 'Run', onClick: () => {} },
          { label: 'Delete', onClick: () => {}, destructive: true },
        ]}
        onClear={() => {}}
      />
    );
    expect(screen.getByText('3 selected')).toBeInTheDocument();
    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls action onClick when pressed', () => {
    const onClick = vi.fn();
    render(
      <SelectionBar
        count={2}
        actions={[{ label: 'Pause', onClick }]}
        onClear={() => {}}
      />
    );
    fireEvent.click(screen.getByText('Pause'));
    expect(onClick).toHaveBeenCalled();
  });

  it('applies destructive styling to destructive actions', () => {
    render(
      <SelectionBar
        count={1}
        actions={[{ label: 'Delete', onClick: () => {}, destructive: true }]}
        onClear={() => {}}
      />
    );
    expect(screen.getByText('Delete').className).toContain('text-danger');
  });

  it('calls onClear when Clear is clicked', () => {
    const onClear = vi.fn();
    render(<SelectionBar count={1} actions={[]} onClear={onClear} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(onClear).toHaveBeenCalled();
  });
});
