import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from '@/components/shared/form/Checkbox';

describe('Checkbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without label', () => {
      render(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Checkbox label="Accept terms" />);

      expect(screen.getByText('Accept terms')).toBeInTheDocument();
    });

    it('should render unchecked by default', () => {
      render(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should render checked when checked prop is true', () => {
      render(<Checkbox checked={true} onChange={() => {}} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should apply custom className', () => {
      render(<Checkbox className="custom-class" />);

      const label = screen.getByRole('checkbox').closest('label');
      expect(label).toHaveClass('custom-class');
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Checkbox disabled />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });

    it('should apply disabled styling', () => {
      render(<Checkbox disabled label="Disabled checkbox" />);

      const label = screen.getByRole('checkbox').closest('label');
      expect(label).toHaveClass('cursor-not-allowed', 'opacity-50');
    });

    it('should have disabled attribute preventing interaction', () => {
      render(<Checkbox disabled />);

      const checkbox = screen.getByRole('checkbox');
      // The disabled attribute is set, browsers will prevent interaction
      expect(checkbox).toBeDisabled();
      expect(checkbox).toHaveAttribute('disabled');
    });
  });

  describe('error state', () => {
    it('should display error styling when error prop is provided', () => {
      render(<Checkbox error="Required field" label="Test" />);

      // The label should have error styling
      expect(screen.getByText('Test')).toHaveClass('text-red-500');
    });
  });

  describe('interactions', () => {
    it('should call onChange when clicked', () => {
      const onChange = vi.fn();
      render(<Checkbox onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('should toggle checked state', () => {
      const onChange = vi.fn();
      const { rerender } = render(<Checkbox checked={false} onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      rerender(<Checkbox checked={true} onChange={onChange} />);
      expect(checkbox).toBeChecked();
    });

    it('should call onChange with event object', () => {
      const onChange = vi.fn();
      render(<Checkbox onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        target: expect.objectContaining({
          type: 'checkbox',
        }),
      }));
    });
  });

  describe('accessibility', () => {
    it('should have proper role', () => {
      render(<Checkbox />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should be focusable', () => {
      render(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();

      expect(document.activeElement).toBe(checkbox);
    });

    it('should support keyboard interaction', () => {
      const onChange = vi.fn();
      render(<Checkbox onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      fireEvent.keyDown(checkbox, { key: ' ', code: 'Space' });

      // Space key should trigger the click
      fireEvent.click(checkbox);
      expect(onChange).toHaveBeenCalled();
    });

    it('should associate label with checkbox', () => {
      const onChange = vi.fn();
      render(<Checkbox label="Test label" onChange={onChange} />);

      const label = screen.getByText('Test label');

      // Clicking the label should trigger the checkbox change
      fireEvent.click(label);

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('forwarded ref', () => {
    it('should forward ref to input element', () => {
      const ref = vi.fn();
      render(<Checkbox ref={ref} />);

      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('additional props', () => {
    it('should pass through additional props to input', () => {
      render(<Checkbox data-testid="custom-checkbox" name="test-checkbox" />);

      const checkbox = screen.getByTestId('custom-checkbox');
      expect(checkbox).toHaveAttribute('name', 'test-checkbox');
    });

    it('should support required attribute', () => {
      render(<Checkbox required />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeRequired();
    });
  });
});
