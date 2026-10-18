import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  label?: string;
};

export function Button({
  children,
  onClick,
  variant = "secondary",
  className = "",
  label,
}: Readonly<ButtonProps>) {
  return (
    <button aria-label={label} className={`button button-${variant} ${className}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}
