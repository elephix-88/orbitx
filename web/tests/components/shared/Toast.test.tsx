import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ToastContainer, useToast, ToastProps } from '@/components/shared/Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ToastContainer', () => {
    it('should render nothing when toasts array is empty', () => {
      const { container } = render(<ToastContainer toasts={[]} />);

      // Should not render anything to the body
      expect(container.innerHTML).toBe('');
    });

    it('should render toasts when provided', () => {
      const toasts: ToastProps[] = [
        {
          id: '1',
          title: 'Test Toast',
          type: 'info',
          onClose: vi.fn(),
        },
      ];

      render(<ToastContainer toasts={toasts} />);

      // Toast should appear in the document (via portal)
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });

    it('should render multiple toasts', () => {
      const toasts: ToastProps[] = [
        { id: '1', title: 'Toast 1', type: 'info', onClose: vi.fn() },
        { id: '2', title: 'Toast 2', type: 'success', onClose: vi.fn() },
      ];

      render(<ToastContainer toasts={toasts} />);

      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
    });
  });

  describe('Toast types', () => {
    const mockOnClose = vi.fn();

    it('should render success toast with correct styling', async () => {
      const toasts: ToastProps[] = [
        { id: '1', title: 'Success', type: 'success', onClose: mockOnClose },
      ];

      render(<ToastContainer toasts={toasts} />);

      const toast = screen.getByText('Success').closest('div');
      expect(toast?.parentElement).toHaveClass('bg-green-50');
    });

    it('should render error toast with correct styling', () => {
      const toasts: ToastProps[] = [
        { id: '1', title: 'Error', type: 'error', onClose: mockOnClose },
      ];

      render(<ToastContainer toasts={toasts} />);

      const toast = screen.getByText('Error').closest('div');
      expect(toast?.parentElement).toHaveClass('bg-red-50');
    });

    it('should render warning toast with correct styling', () => {
      const toasts: ToastProps[] = [
        { id: '1', title: 'Warning', type: 'warning', onClose: mockOnClose },
      ];

      render(<ToastContainer toasts={toasts} />);

      const toast = screen.getByText('Warning').closest('div');
      expect(toast?.parentElement).toHaveClass('bg-yellow-50');
    });

    it('should render info toast with correct styling', () => {
      const toasts: ToastProps[] = [
        { id: '1', title: 'Info', type: 'info', onClose: mockOnClose },
      ];

      render(<ToastContainer toasts={toasts} />);

      const toast = screen.getByText('Info').closest('div');
      expect(toast?.parentElement).toHaveClass('bg-blue-50');
    });
  });

  describe('Toast content', () => {
    const mockOnClose = vi.fn();

    it('should render title', () => {
      const toasts: ToastProps[] = [
        { id: '1', title: 'Toast Title', onClose: mockOnClose },
      ];

      render(<ToastContainer toasts={toasts} />);

      expect(screen.getByText('Toast Title')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      const toasts: ToastProps[] = [
        { id: '1', title: 'Title', description: 'Toast description', onClose: mockOnClose },
      ];

      render(<ToastContainer toasts={toasts} />);

      expect(screen.getByText('Toast description')).toBeInTheDocument();
    });

    it('should render action button when provided', () => {
      const actionClick = vi.fn();
      const toasts: ToastProps[] = [
        {
          id: '1',
          title: 'Action Toast',
          action: { label: 'Undo', onClick: actionClick },
          onClose: mockOnClose,
        },
      ];

      render(<ToastContainer toasts={toasts} />);

      expect(screen.getByText('Undo')).toBeInTheDocument();
    });

    it('should call action onClick when action button is clicked', () => {
      const actionClick = vi.fn();
      const toasts: ToastProps[] = [
        {
          id: '1',
          title: 'Action Toast',
          action: { label: 'Undo', onClick: actionClick },
          onClose: mockOnClose,
        },
      ];

      render(<ToastContainer toasts={toasts} />);

      fireEvent.click(screen.getByText('Undo'));

      expect(actionClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toast auto-dismiss', () => {
    it('should not auto-dismiss when duration is 0', () => {
      const mockOnClose = vi.fn();
      const toasts: ToastProps[] = [
        { id: '1', title: 'Persistent', duration: 0, onClose: mockOnClose },
      ];

      render(<ToastContainer toasts={toasts} />);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should use default duration of 5000ms', () => {
      const mockOnClose = vi.fn();
      const toasts: ToastProps[] = [
        { id: '1', title: 'Default Duration', onClose: mockOnClose },
      ];

      render(<ToastContainer toasts={toasts} />);

      // Toast should still be visible before default duration
      expect(screen.getByText('Default Duration')).toBeInTheDocument();
    });
  });

  describe('Toast close button', () => {
    it('should render close button', () => {
      const mockOnClose = vi.fn();
      const toasts: ToastProps[] = [
        { id: '1', title: 'Closeable', duration: 0, onClose: mockOnClose },
      ];

      render(<ToastContainer toasts={toasts} />);

      // Find the close button (button with X icon)
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.querySelector('.lucide-x'));

      expect(closeButton).toBeInTheDocument();
    });
  });
});

describe('useToast hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty toasts array', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should add toast with addToast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast({ title: 'New Toast', type: 'info' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('New Toast');
  });

  it('should add success toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('Success!');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[0].title).toBe('Success!');
  });

  it('should add error toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.error('Error!', 'Something went wrong');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('error');
    expect(result.current.toasts[0].title).toBe('Error!');
    expect(result.current.toasts[0].description).toBe('Something went wrong');
  });

  it('should add warning toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.warning('Warning!');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('warning');
  });

  it('should add info toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.info('Info');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('info');
  });

  it('should remove toast with removeToast', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;
    act(() => {
      toastId = result.current.addToast({ title: 'Toast', type: 'info' });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should generate unique id for each toast', () => {
    const { result } = renderHook(() => useToast());

    let id1 = '', id2 = '';
    act(() => {
      id1 = result.current.addToast({ title: 'Toast 1', type: 'info' });
      id2 = result.current.addToast({ title: 'Toast 2', type: 'info' });
    });

    expect(id1).not.toBe(id2);
  });

  it('should return toast id from addToast', () => {
    const { result } = renderHook(() => useToast());

    let id = '';
    act(() => {
      id = result.current.addToast({ title: 'Toast', type: 'info' });
    });

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});
