import { Search } from 'lucide-react';
import { ReactNode } from 'react';

interface FilterBarProps {
  actions?: ReactNode;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  searchValue: string;
}

export function FilterBar({ actions, onSearchChange, placeholder = 'Search', searchValue }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:w-72"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          value={searchValue}
        />
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
