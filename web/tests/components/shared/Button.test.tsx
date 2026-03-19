import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/shared/Button";
import { Plus, Settings } from "lucide-react";

describe("Button", () => {
  describe("rendering", () => {
    it("should render children correctly", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText("Click me")).toBeInTheDocument();
    });

    it("should render with default variant (primary)", () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn-primary");
    });

    it("should render with secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn-secondary");
    });

    it("should render with ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("btn-ghost");
    });

    it("should apply variant classes", () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("btn-destructive");
    });

    it("should render with outline variant", () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-transparent");
      expect(button).toHaveClass("border");
    });

    it("should render with warning variant", () => {
      render(<Button variant="warning">Warning</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-amber-500");
    });

    it("should render with success variant", () => {
      render(<Button variant="success">Success</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-emerald-500");
    });
  });

  describe("sizes", () => {
    it("should render with default size (md)", () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10");
    });

    it("should render with xs size", () => {
      render(<Button size="xs">XS</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-7");
    });

    it("should render with sm size", () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-8");
    });

    it("should render with lg size", () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-12");
    });

    it("should render with xl size", () => {
      render(<Button size="xl">Extra Large</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-14");
    });

    it("should render with icon size", () => {
      render(<Button size="icon"><Plus /></Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10");
      expect(button).toHaveClass("p-0");
      expect(button).toHaveClass("items-center");
    });
  });

  describe("width", () => {
    it("should render with full width", () => {
      render(<Button width="full">Full Width</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("w-full");
    });

    it("should render with fit width", () => {
      render(<Button width="fit">Fit</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("w-fit");
    });
  });

  describe("icons", () => {
    it("should render left and right icons", () => {
      render(
        <Button
          leftIcon={<span data-testid="left-icon">L</span>}
          rightIcon={<span data-testid="right-icon">R</span>}
        >
          Content
        </Button>
      );

      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("should render with left icon only", () => {
      render(<Button leftIcon={<Plus data-testid="left-icon" />}>Add</Button>);
      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
      expect(screen.getByText("Add")).toBeInTheDocument();
    });

    it("should render with right icon only", () => {
      render(<Button rightIcon={<Settings data-testid="right-icon" />}>Settings</Button>);
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });

    it("should render icon-only button", () => {
      render(<Button icon={<Plus data-testid="icon" />} />);
      expect(screen.getByTestId("icon")).toBeInTheDocument();
    });

    it("should auto-apply icon size when icon prop is used without children", () => {
      render(<Button size="icon" icon={<Plus data-testid="icon" />} />);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10");
      expect(button).toHaveClass("p-0");
      expect(button).toHaveClass("items-center");
    });
  });

  describe("loading state", () => {
    it("should show loader and be disabled when isLoading is true", () => {
      render(<Button isLoading>Click me</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button.querySelector(".animate-spin")).toBeInTheDocument();
      expect(screen.queryByText("Click me")).not.toBeInTheDocument();
    });

    it("should not call onClick when loading", () => {
      const onClick = vi.fn();
      render(<Button isLoading onClick={onClick}>Click me</Button>);

      fireEvent.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("should be disabled when disabled prop is true", () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Click me
        </Button>
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("interactions", () => {
    it("should handle click events", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByText("Click me"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("custom className", () => {
    it("should apply custom className", () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("forwarded ref", () => {
    it("should forward ref to button element", () => {
      const ref = vi.fn();
      render(<Button ref={ref}>Button</Button>);

      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe("button type", () => {
    it("should accept type prop", () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });
  });
});
