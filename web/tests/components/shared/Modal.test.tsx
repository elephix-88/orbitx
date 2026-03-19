import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal, Dialog } from '@/components/shared/Modal';

describe('Modal', () => {
  const onClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose,
    children: <div>Modal Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('should render when isOpen is true', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(<Modal {...defaultProps} title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(
      <Modal {...defaultProps} title="Title" description="Test Description" />
    );
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should render footer when provided', () => {
    render(<Modal {...defaultProps} footer={<button>Submit</button>} />);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    render(<Modal {...defaultProps} title="Title" />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key is pressed', () => {
    render(<Modal {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not show close button when showCloseButton is false', () => {
    render(<Modal {...defaultProps} title="Title" showCloseButton={false} />);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('should hide header when headerless is true', () => {
    render(<Modal {...defaultProps} title="Title" headerless />);
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<Modal {...defaultProps} title="Modal Title" />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('should apply size variant classes', () => {
    const { rerender } = render(<Modal {...defaultProps} size="xs" />);
    expect(screen.getByRole('dialog').className).toContain('max-w-sm');

    rerender(<Modal {...defaultProps} size="lg" />);
    expect(screen.getByRole('dialog').className).toContain('max-w-2xl');

    rerender(<Modal {...defaultProps} size="xl" />);
    expect(screen.getByRole('dialog').className).toContain('max-w-4xl');
  });

  it('should apply custom className', () => {
    render(<Modal {...defaultProps} className="custom-modal-class" />);
    expect(screen.getByRole('dialog').className).toContain('custom-modal-class');
  });
});

describe('Dialog', () => {
  const onClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose,
    title: 'Dialog Title',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('should render title', () => {
    render(<Dialog {...defaultProps} />);
    expect(screen.getByText('Dialog Title')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(<Dialog {...defaultProps} description="Dialog description" />);
    expect(screen.getByText('Dialog description')).toBeInTheDocument();
  });

  it('should render children', () => {
    render(
      <Dialog {...defaultProps}>
        <p>Custom content</p>
      </Dialog>
    );
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });

  it('should render actions when provided', () => {
    render(
      <Dialog
        {...defaultProps}
        actions={
          <>
            <button>Cancel</button>
            <button>Confirm</button>
          </>
        }
      />
    );
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    render(
      <Dialog {...defaultProps} icon={<span data-testid="test-icon">!</span>} />
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('should apply danger variant styles to icon wrapper', () => {
    render(
      <Dialog
        {...defaultProps}
        variant="danger"
        icon={<span data-testid="danger-icon">!</span>}
      />
    );

    // Find the icon wrapper (grandparent of icon text)
    const icon = screen.getByTestId('danger-icon');
    const iconWrapper = icon.parentElement?.parentElement;
    expect(iconWrapper?.className).toContain('bg-red');
  });

  it('should apply warning variant styles to icon wrapper', () => {
    render(
      <Dialog
        {...defaultProps}
        variant="warning"
        icon={<span data-testid="warning-icon">!</span>}
      />
    );

    const icon = screen.getByTestId('warning-icon');
    const iconWrapper = icon.parentElement?.parentElement;
    expect(iconWrapper?.className).toContain('bg-amber');
  });

  it('should apply success variant styles to icon wrapper', () => {
    render(
      <Dialog
        {...defaultProps}
        variant="success"
        icon={<span data-testid="success-icon">✓</span>}
      />
    );

    const icon = screen.getByTestId('success-icon');
    const iconWrapper = icon.parentElement?.parentElement;
    expect(iconWrapper?.className).toContain('bg-emerald');
  });
});
