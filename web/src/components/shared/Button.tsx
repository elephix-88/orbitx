import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva("btn-base relative overflow-hidden", {
  variants: {
    variant: {
      primary: "btn-primary",
      secondary: "btn-secondary",
      ghost: "btn-ghost",
      destructive: "btn-destructive",
      outline:
        "bg-transparent border border-[rgba(0,212,255,0.2)] text-[#00D4FF] hover:bg-[rgba(0,212,255,0.08)] hover:border-[rgba(0,212,255,0.35)] uppercase tracking-wider rounded-[4px]",
      link: "text-[#00D4FF] hover:underline p-0 h-auto shadow-none hover:shadow-none hover:translate-y-0 active:scale-100 uppercase tracking-wider",
      warning:
        "bg-[#FFB800] hover:bg-[#E5A600] text-[#0F1729] uppercase tracking-wider rounded-[4px] border border-[rgba(255,184,0,0.3)] hover:shadow-[0_0_12px_rgba(255,184,0,0.2)]",
      success:
        "bg-[#00E5A0] hover:bg-[#00CC8E] text-[#0F1729] uppercase tracking-wider rounded-[4px] border border-[rgba(0,229,160,0.3)] hover:shadow-[0_0_12px_rgba(0,229,160,0.2)]",
    },
    size: {
      xs: "h-7 px-2 text-sm font-semibold",
      sm: "h-8 px-3 text-sm font-semibold",
      md: "h-10 px-5 text-[15px] font-semibold",
      lg: "h-12 px-8 text-base font-bold",
      xl: "h-14 px-10 text-lg font-bold",
      icon: "h-10 w-10 p-0 flex items-center justify-center font-semibold", // Fixed size for icons
      "icon-sm": "h-8 w-8 p-0 flex items-center justify-center font-semibold",
      "icon-xs": "h-6 w-6 p-0 flex items-center justify-center font-semibold",
      auto: "h-auto p-0 font-semibold",
    },
    width: {
      auto: "w-auto",
      full: "w-full",
      fit: "w-fit",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
    width: "auto",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode; // For icon-only buttons
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      width,
      isLoading,
      leftIcon,
      rightIcon,
      icon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // If icon prop is present, treat as icon button if size isn't explicitly set to something else
    const computedSize = icon && !children && size === "md" ? "icon" : size;

    return (
      <button
        className={cn(
          buttonVariants({ variant, size: computedSize, width }),
          className
        )}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {icon ? (
              <span className="flex items-center justify-center">{icon}</span>
            ) : (
              <>
                {leftIcon && (
                  <span className="mr-2 -ml-1 inline-flex shrink-0">
                    {leftIcon}
                  </span>
                )}
                <span className="truncate">{children}</span>
                {rightIcon && (
                  <span className="ml-2 -mr-1 inline-flex shrink-0">
                    {rightIcon}
                  </span>
                )}
              </>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
