import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button as SharedButton } from '@shared-ui/button';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-secondary border-primary',
  secondary: 'bg-white text-primary hover:bg-gray-50 border-gray-300',
  accent: 'bg-accent text-white hover:bg-[#E65800] border-accent',
  danger: 'bg-danger text-white hover:bg-danger/90 border-danger',
  outline: 'bg-white text-primary hover:bg-gray-50 border-gray-300',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 border-transparent',
};

export function Button({ children, className = '', icon, variant = 'primary', ...props }: ButtonProps) {
  return (
    <SharedButton
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      type="button"
      variant="unstyled"
      {...props}
    >
      {icon}
      {children}
    </SharedButton>
  );
}
