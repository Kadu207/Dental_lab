import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "accent" | "purple" | "outline" | "danger" | "warning" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary: "btn btn-primary",
  accent: "btn btn-accent",
  purple: "btn btn-purple",
  outline: "btn btn-outline",
  danger: "btn btn-danger",
  warning: "btn btn-warning",
  ghost: "btn btn-ghost",
};

const sizeClass: Record<Size, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

export function ActionButton({
  icon,
  variant = "outline",
  size = "md",
  children,
  className = "",
  type = "button",
  ...props
}: Props) {
  const classes = [variantClass[variant], sizeClass[size], icon && children ? "btn-with-icon" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={classes} {...props}>
      {icon ? <span className="btn-icon" aria-hidden>{icon}</span> : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
}
