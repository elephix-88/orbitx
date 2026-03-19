import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog, AlertDialog } from '@/components/shared/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render with custom title and message', () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          title="Custom Title"
          message="Custom message here"
        />
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom message here')).toBeInTheDocument();
    });

    it('should render with custom button text', () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          confirmText="Yes, remove it"
          cancelText="No, keep it"
        />
      );

      expect(screen.getByText('Yes, remove it')).toBeInTheDocument();
      expect(screen.getByText('No, keep it')).toBeInTheDocument();
    });

    it('should render React node as message', () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          message={<span data-testid="custom-message">Custom React content</span>}
        />
      );

      expect(screen.getByTestId('custom-message')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should render danger variant by default', () => {
      render(<ConfirmDialog {...defaultProps} />);

      // The Delete button should have destructive styling
      const confirmButton = screen.getByText('Delete');
      expect(confirmButton).toBeInTheDocument();
    });

    it('should render warning variant', () => {
      render(<ConfirmDialog {...defaultProps} variant="warning" />);

      const confirmButton = screen.getByText('Delete');
      expect(confirmButton).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onConfirm when confirm button is clicked', async () => {
      const onConfirm = vi.fn();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should handle async onConfirm', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading spinner on confirm button', () => {
      render(<ConfirmDialog {...defaultProps} confirmLoading={true} />);

      // When loading, the button shows a spinner instead of text
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable cancel button when loading', () => {
      render(<ConfirmDialog {...defaultProps} confirmLoading={true} />);

      const cancelButton = screen.getByText('Cancel').closest('button');
      expect(cancelButton).toBeDisabled();
    });
  });
});

describe('AlertDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Alert Title',
    message: 'Alert message',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with required props', () => {
      render(<AlertDialog {...defaultProps} />);

      expect(screen.getByText('Alert Title')).toBeInTheDocument();
      expect(screen.getByText('Alert message')).toBeInTheDocument();
      expect(screen.getByText('OK')).toBeInTheDocument();
    });

    it('should render with custom button text', () => {
      render(<AlertDialog {...defaultProps} buttonText="Got it" />);

      expect(screen.getByText('Got it')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<AlertDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Alert Title')).not.toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should render info variant by default', () => {
      render(<AlertDialog {...defaultProps} />);
      expect(screen.getByText('Alert Title')).toBeInTheDocument();
    });

    it('should render warning variant', () => {
      render(<AlertDialog {...defaultProps} variant="warning" />);
      expect(screen.getByText('Alert Title')).toBeInTheDocument();
    });

    it('should render success variant', () => {
      render(<AlertDialog {...defaultProps} variant="success" />);
      expect(screen.getByText('Alert Title')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when button is clicked', () => {
      const onClose = vi.fn();
      render(<AlertDialog {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('OK'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
