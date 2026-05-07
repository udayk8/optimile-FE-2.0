import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "default";
  children: ReactNode;
};

export function Button({ variant = "default", className = "", children, ...props }: Props) {
  const classes = ["btn"];
  if (variant === "primary") classes.push("btn-primary");
  if (variant === "ghost") classes.push("btn-ghost");
  if (className) classes.push(className);
  return (
    <button className={classes.join(" ")} {...props}>
      {children}
    </button>
  );
}
