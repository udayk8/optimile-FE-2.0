import { cn } from "../../lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-primary/5 p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-bold transition",
            active === tab ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-white hover:text-primary",
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
