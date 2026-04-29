export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span className="inline-flex items-center gap-2" key={`${item.label}-${index}`}>
            {item.onClick && !isLast ? (
              <button className="text-primary hover:text-secondary" onClick={item.onClick} type="button">{item.label}</button>
            ) : (
              <span className={isLast ? 'text-text' : undefined}>{item.label}</span>
            )}
            {!isLast && <span className="text-gray-300">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
