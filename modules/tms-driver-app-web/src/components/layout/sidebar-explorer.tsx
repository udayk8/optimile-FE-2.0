import { useEffect, useMemo, useState, type ComponentType } from "react";
import { ChevronDown, ChevronRight, FolderTree, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";

export interface ExplorerNavItem {
  id?: string;
  to?: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  children?: ExplorerNavItem[];
  matchMode?: "inclusive" | "exact" | "never";
  state?: unknown;
}

function getItemId(item: ExplorerNavItem, parentId?: string) {
  return item.id ?? `${parentId ?? "root"}:${item.label.toLowerCase().replace(/\s+/g, "-")}`;
}

function matchesPath(pathname: string, item: ExplorerNavItem) {
  if (!item.to || item.matchMode === "never") {
    return false;
  }
  if (item.matchMode === "exact") {
    return pathname === item.to;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function hasActiveDescendant(pathname: string, item: ExplorerNavItem): boolean {
  if (matchesPath(pathname, item)) {
    return true;
  }
  return Boolean(item.children?.some((child) => hasActiveDescendant(pathname, child)));
}

function filterItems(items: ExplorerNavItem[], query: string): ExplorerNavItem[] {
  if (!query) {
    return items;
  }

  return items.reduce<ExplorerNavItem[]>((accumulator, item) => {
      const filteredChildren = item.children ? filterItems(item.children, query) : undefined;
      const matches =
        item.label.toLowerCase().includes(query) ||
        item.children?.some((child) => child.label.toLowerCase().includes(query));

      if (matches || filteredChildren?.length) {
        accumulator.push({
          ...item,
          children: filteredChildren,
        });
      }
      return accumulator;
    }, []);
}

function collectExpandedIds(items: ExplorerNavItem[], pathname: string, parentId?: string): string[] {
  return items.flatMap((item) => {
    const itemId = getItemId(item, parentId);
    if (!item.children?.length) {
      return [];
    }
    const childExpanded = collectExpandedIds(item.children, pathname, itemId);
    return hasActiveDescendant(pathname, item) ? [itemId, ...childExpanded] : childExpanded;
  });
}

function ExplorerNode({
  item,
  level,
  parentId,
  pathname,
  collapsed,
  expandedNodes,
  onToggle,
}: {
  item: ExplorerNavItem;
  level: number;
  parentId?: string;
  pathname: string;
  collapsed: boolean;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
}) {
  const itemId = getItemId(item, parentId);
  const hasChildren = Boolean(item.children?.length);
  const isExpanded = expandedNodes.has(itemId);
  const isActive = matchesPath(pathname, item);
  const isParentActive = hasActiveDescendant(pathname, item);
  const Icon = item.icon ?? FolderTree;

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          title={collapsed ? item.label : undefined}
          onClick={() => onToggle(itemId)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition",
            isParentActive
              ? "bg-primary/[0.08] text-slate-950 ring-1 ring-primary/20 shadow-sm"
              : "text-slate-600 hover:bg-primary/[0.05] hover:text-slate-950",
            collapsed && "justify-center px-2.5",
          )}
          style={!collapsed ? { paddingLeft: `${0.75 + level * 0.85}rem` } : undefined}
        >
          <Icon className="size-4 shrink-0" />
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {isExpanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
            </>
          ) : null}
        </button>

        {!collapsed && isExpanded ? (
          <div className="space-y-1">
            {item.children?.map((child) => (
              <ExplorerNode
                key={getItemId(child, itemId)}
                item={child}
                level={level + 1}
                parentId={itemId}
                pathname={pathname}
                collapsed={collapsed}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to ?? "#"}
      state={item.state}
      title={collapsed ? item.label : undefined}
      className={() =>
        cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
          isActive
            ? "bg-gradient-to-r from-indigo-50 to-sky-50 text-indigo-950 ring-1 ring-indigo-200/80 shadow-sm"
            : "text-slate-600 hover:bg-primary/[0.05] hover:text-slate-950",
          collapsed && "justify-center px-2.5",
        )
      }
      style={!collapsed ? { paddingLeft: `${0.75 + level * 0.85}rem` } : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </NavLink>
  );
}

export function SidebarExplorer({
  title,
  subtitle,
  actorLabel,
  items,
  autoCollapse = false,
}: {
  title: string;
  subtitle: string;
  actorLabel: string;
  items: ExplorerNavItem[];
  autoCollapse?: boolean;
}) {
  const location = useLocation();
  const pathname = location.pathname;
  const storageKey = `sidebar-explorer:${actorLabel}:${title}`;
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const isCollapsed = collapsed && !hoverExpanded;

  const searchValue = search.trim().toLowerCase();
  const filteredItems = useMemo(() => filterItems(items, searchValue), [items, searchValue]);
  const expandedSet = useMemo(
    () => new Set(Object.entries(expandedNodes).filter(([, value]) => value).map(([key]) => key)),
    [expandedNodes],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as {
        collapsed?: boolean;
        expandedNodes?: Record<string, boolean>;
      };
      setCollapsed(parsed.collapsed ?? true);
      setExpandedNodes(parsed.expandedNodes ?? {});
    } catch {
      // Ignore invalid persisted sidebar state.
    }
  }, [storageKey]);

  useEffect(() => {
    if (autoCollapse) {
      setCollapsed(true);
    }
  }, [autoCollapse]);

  useEffect(() => {
    const autoExpanded = collectExpandedIds(items, pathname);
    if (!autoExpanded.length) {
      return;
    }
    setExpandedNodes((current) => {
      const next = { ...current };
      autoExpanded.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  }, [items, pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        collapsed,
        expandedNodes,
      }),
    );
  }, [collapsed, expandedNodes, storageKey]);

  function toggleNode(nodeId: string) {
    if (collapsed) {
      setCollapsed(false);
      return;
    }
    setExpandedNodes((current) => ({
      ...current,
      [nodeId]: !current[nodeId],
    }));
  }

  return (
    <aside
      onMouseEnter={() => {
        if (collapsed) {
          setHoverExpanded(true);
        }
      }}
      onMouseLeave={() => setHoverExpanded(false)}
      className={cn(
        "hidden shrink-0 border-r border-border/70 bg-gradient-to-b from-slate-50/92 via-white to-slate-50/88 transition-all duration-200 lg:flex lg:flex-col",
        isCollapsed ? "w-[74px]" : "w-[272px]",
      )}
    >
      <div className="border-b border-border/75 bg-white/55 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          {!isCollapsed ? (
            <div>
              <div className="inline-flex rounded-full border border-primary/10 bg-primary/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-primary">
                {actorLabel}
              </div>
              <h2 className="mt-2 text-[15px] font-semibold leading-tight tracking-[-0.01em]">{title}</h2>
              <p className="mt-1 max-w-[26ch] text-[11px] leading-5 text-muted-foreground">{subtitle}</p>
            </div>
          ) : (
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/10 bg-primary/[0.08] text-primary">
              <FolderTree className="size-5" />
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="rounded-2xl border border-border/80 bg-card/90 p-2 text-slate-600 transition hover:border-primary/25 hover:bg-primary/[0.045] hover:text-slate-950"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        {!isCollapsed ? (
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 rounded-2xl border-border/80 bg-card/80 pl-9"
              placeholder="Search navigation"
            />
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3.5">
        {filteredItems.map((item) => (
          <ExplorerNode
            key={getItemId(item)}
            item={item}
            level={0}
            pathname={pathname}
            collapsed={isCollapsed}
            expandedNodes={expandedSet}
            onToggle={toggleNode}
          />
        ))}
      </nav>
    </aside>
  );
}
