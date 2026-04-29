type StatusTone = 'success' | 'warning' | 'danger' | 'primary' | 'neutral';

interface StatusBadgeProps {
  children: string;
  tone?: StatusTone;
}

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-success/10 text-success ring-success/20',
  warning: 'bg-warning/10 text-warning ring-warning/20',
  danger: 'bg-danger/10 text-danger ring-danger/20',
  primary: 'bg-primary/10 text-primary ring-primary/20',
  neutral: 'bg-gray-100 text-gray-600 ring-gray-200',
};

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${toneClasses[tone]}`}>{children}</span>;
}
