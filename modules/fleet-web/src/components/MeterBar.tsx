type MeterTone = 'success' | 'warning' | 'danger' | 'primary';

const toneClasses: Record<MeterTone, string> = {
  danger: 'bg-danger',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
};

export function MeterBar({ className = '', tone = 'primary', value }: { className?: string; tone?: MeterTone; value: number }) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={`h-2 overflow-hidden rounded-full bg-gray-100 ${className}`}>
      <div className={`h-full rounded-full ${toneClasses[tone]}`} style={{ transform: `translateX(-${100 - clamped}%)` }} />
    </div>
  );
}
