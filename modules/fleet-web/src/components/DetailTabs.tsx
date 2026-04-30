import { ReactNode } from 'react';

export interface DetailTabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface DetailTabsProps {
  activeTab: string;
  onChange: (tab: string) => void;
  tabs: DetailTabItem[];
}

export function DetailTabs({ activeTab, onChange, tabs }: DetailTabsProps) {
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 px-4 pt-4">
        {tabs.map((tab) => (
          <button
            className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-bold transition ${
              active.id === tab.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
            }`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-5">{active.content}</div>
    </section>
  );
}
