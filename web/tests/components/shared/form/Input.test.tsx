import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/shared/form/Input';

describe('Input', () => {
  it('should render basic input', () => {
    render(<Input placeholder="Enter text" />);

    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(<Input label="Email" />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('should render required indicator when required', () => {
    render(<Input label="Email" required />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should not render required indicator when not required', () => {
    render(<Input label="Email" />);

    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<Input label="Email" error="Invalid email format" />);

    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('should display helper text', () => {
    render(<Input label="Password" helperText="Must be at least 8 characters" />);

    expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
  });

  it('should prefer error over helper text', () => {
    render(
      <Input
        label="Email"
        error="Invalid email"
        helperText="Enter your email address"
      />
    );

    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument();
  });

  it('should show error icon when error is present', () => {
    render(<Input label="Email" error="Invalid email" />);

    // AlertCircle icon should be rendered
    const input = screen.getByLabelText('Email');
    const container = input.parentElement;
    expect(container?.querySelector('svg')).toBeInTheDocument();
  });

  it('should set aria-invalid when error is present', () => {
    render(<Input label="Email" error="Invalid email" />);

    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should set aria-invalid to false when no error', () => {
    render(<Input label="Email" />);

    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'false');
  });

  it('should set aria-describedby for error', () => {
    render(<Input label="Email" error="Invalid email" id="email-input" />);

    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-describedby',
      'email-input-error'
    );
  });

  it('should set aria-describedby for helper text', () => {
    render(<Input label="Email" helperText="Help text" id="email-input" />);

    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-describedby',
      'email-input-helper'
    );
  });

  it('should handle user input', async () => {
    const user = userEvent.setup();
    render(<Input label="Name" />);

    const input = screen.getByLabelText('Name');
    await user.type(input, 'John Doe');

    expect(input).toHaveValue('John Doe');
  });

  it('should call onChange handler', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Input label="Name" onChange={onChange} />);

    const input = screen.getByLabelText('Name');
    await user.type(input, 'a');

    expect(onChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input label="Email" disabled />);

    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('should apply custom className', () => {
    render(<Input label="Email" className="custom-class" />);

    expect(screen.getByLabelText('Email')).toHaveClass('custom-class');
  });

  it('should generate id from label if not provided', () => {
    render(<Input label="User Name" />);

    const input = screen.getByLabelText('User Name');
    expect(input).toHaveAttribute('id', 'user-name');
  });

  it('should use provided id over generated one', () => {
    render(<Input label="Email" id="custom-email-id" />);

    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'custom-email-id');
  });

  it('should forward ref to input element', () => {
    const ref = vi.fn();
    render(<Input label="Test" ref={ref} />);

    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement);
  });

  it('should apply error styles when error is present', () => {
    render(<Input label="Email" error="Invalid email" />);

    const input = screen.getByLabelText('Email');
    expect(input.className).toContain('border-red');
  });

  it('should spread additional props to input', () => {
    render(
      <Input
        label="Age"
        type="number"
        min={0}
        max={100}
        data-testid="age-input"
      />
    );

    const input = screen.getByLabelText('Age');
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
    expect(input).toHaveAttribute('data-testid', 'age-input');
  });

  it('should handle paste event', async () => {
    const onPaste = vi.fn();
    render(<Input label="Email" onPaste={onPaste} />);

    const input = screen.getByLabelText('Email');
    fireEvent.paste(input, {
      clipboardData: { getData: () => 'pasted text' },
    });

    expect(onPaste).toHaveBeenCalled();
  });

  it('should handle blur event', async () => {
    const onBlur = vi.fn();
    const user = userEvent.setup();
    render(<Input label="Email" onBlur={onBlur} />);

    const input = screen.getByLabelText('Email');
    await user.click(input);
    await user.tab();

    expect(onBlur).toHaveBeenCalled();
  });

  it('should handle focus event', async () => {
    const onFocus = vi.fn();
    const user = userEvent.setup();
    render(<Input label="Email" onFocus={onFocus} />);

    const input = screen.getByLabelText('Email');
    await user.click(input);

    expect(onFocus).toHaveBeenCalled();
  });
});
