import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Select } from '@/components/shared/form/Select';

describe('Select', () => {
  const mockOptions = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
  ];

  const defaultProps = {
    options: mockOptions,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any portals
    const portals = document.querySelectorAll('[data-testid="portal"]');
    portals.forEach((portal) => portal.remove());
  });

  describe('rendering', () => {
    it('should render with placeholder', () => {
      render(<Select {...defaultProps} />);

      expect(screen.getByText('Select an option')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<Select {...defaultProps} placeholder="Choose something" />);

      expect(screen.getByText('Choose something')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Select {...defaultProps} label="Select Label" />);

      expect(screen.getByText('Select Label')).toBeInTheDocument();
    });

    it('should render selected value', () => {
      render(<Select {...defaultProps} value="2" />);

      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Select {...defaultProps} className="custom-class" />);

      const container = screen.getByText('Select an option').closest('.custom-class');
      expect(container).toBeInTheDocument();
    });
  });

  describe('dropdown behavior', () => {
    it('should open dropdown when clicked', async () => {
      render(<Select {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Option 1')).toBeInTheDocument();
        expect(screen.getByText('Option 2')).toBeInTheDocument();
        expect(screen.getByText('Option 3')).toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <Select {...defaultProps} />
          <div data-testid="outside">Outside</div>
        </div>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Option 1')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByTestId('outside'));

      await waitFor(() => {
        // Options should no longer be visible in the dropdown
        const dropdown = document.querySelector('[class*="overflow-hidden rounded-xl"]');
        expect(dropdown).not.toBeInTheDocument();
      });
    });

    it('should close dropdown when option is selected', async () => {
      render(<Select {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Option 1')).toBeInTheDocument();
      });

      // Find the option in the dropdown (portal)
      const option = screen.getAllByText('Option 1')[0];
      fireEvent.click(option);

      await waitFor(() => {
        const dropdown = document.querySelector('[class*="overflow-hidden rounded-xl"]');
        expect(dropdown).not.toBeInTheDocument();
      });
    });
  });

  describe('selection', () => {
    it('should call onChange with selected value', async () => {
      const onChange = vi.fn();
      render(<Select {...defaultProps} onChange={onChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Option 2')).toBeInTheDocument();
      });

      // Find the option in the dropdown
      const options = screen.getAllByText('Option 2');
      fireEvent.click(options[0]);

      expect(onChange).toHaveBeenCalledWith('2');
    });

    it('should show checkmark on selected option', async () => {
      render(<Select {...defaultProps} value="2" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        // The selected option should have the check icon (svg with lucide-check class)
        const checkIcon = document.querySelector('.lucide-check');
        expect(checkIcon).toBeInTheDocument();
      });
    });

    it('should handle numeric values', async () => {
      const numericOptions = [
        { value: 1, label: 'Number 1' },
        { value: 2, label: 'Number 2' },
      ];
      const onChange = vi.fn();

      render(<Select options={numericOptions} onChange={onChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Number 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByText('Number 1')[0]);

      expect(onChange).toHaveBeenCalledWith(1);
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Select {...defaultProps} disabled />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not open dropdown when disabled', () => {
      render(<Select {...defaultProps} disabled />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Options should not appear
      expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    });

    it('should apply disabled styling', () => {
      render(<Select {...defaultProps} disabled />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('disabled options', () => {
    it('should not select disabled options', async () => {
      const optionsWithDisabled = [
        { value: '1', label: 'Option 1' },
        { value: '2', label: 'Option 2', disabled: true },
        { value: '3', label: 'Option 3' },
      ];
      const onChange = vi.fn();

      render(<Select options={optionsWithDisabled} onChange={onChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Option 2')).toBeInTheDocument();
      });

      // Click the disabled option
      const disabledOption = screen.getAllByText('Option 2')[0];
      fireEvent.click(disabledOption);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should show disabled styling for disabled options', async () => {
      const optionsWithDisabled = [
        { value: '1', label: 'Option 1' },
        { value: '2', label: 'Option 2', disabled: true },
      ];

      render(<Select options={optionsWithDisabled} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const disabledOption = screen.getAllByText('Option 2')[0].closest('div');
        expect(disabledOption).toHaveClass('opacity-50', 'cursor-not-allowed');
      });
    });
  });

  describe('error state', () => {
    it('should display error message', () => {
      render(<Select {...defaultProps} error="This field is required" />);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error styling', () => {
      render(<Select {...defaultProps} error="Error" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-red-500');
    });
  });

  describe('helper text', () => {
    it('should display helper text', () => {
      render(<Select {...defaultProps} helperText="Select your preference" />);

      expect(screen.getByText('Select your preference')).toBeInTheDocument();
    });

    it('should prioritize error over helper text', () => {
      render(
        <Select
          {...defaultProps}
          error="Error message"
          helperText="Helper text"
        />
      );

      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper button role', () => {
      render(<Select {...defaultProps} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should generate id from label', () => {
      render(<Select {...defaultProps} label="Test Label" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('id', 'test-label');
    });

    it('should use custom id when provided', () => {
      render(<Select {...defaultProps} id="custom-id" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('id', 'custom-id');
    });
  });
});
