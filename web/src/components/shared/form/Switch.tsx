import React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (_checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  checkedIcon?: React.ReactNode;
  uncheckedIcon?: React.ReactNode;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  className,
  size = "md",
  checkedIcon,
  uncheckedIcon,
}) => {
  const sizes = {
    sm: {
      switch: "w-8 h-4",
      thumb: "w-3 h-3",
      translate: "translate-x-4",
    },
    md: {
      switch: "w-11 h-6",
      thumb: "w-5 h-5",
      translate: "translate-x-5",
    },
    lg: {
      switch: "w-14 h-7",
      thumb: "w-6 h-6",
      translate: "translate-x-7",
    },
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex items-center rounded-sm transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D3557]",
        sizes[size].switch,
        checked ? "bg-[#E63946]" : "bg-[#A8DADC] dark:bg-slate-700",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <span className="sr-only">Use setting</span>
      <span
        className={cn(
          "pointer-events-none inline-block transform rounded-sm bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
          sizes[size].thumb,
          checked ? sizes[size].translate : "translate-x-0.5",
          "flex items-center justify-center"
        )}
      >
        {checked ? checkedIcon : uncheckedIcon}
      </span>
    </button>
  );
};
