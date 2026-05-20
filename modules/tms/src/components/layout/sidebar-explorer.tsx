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
            "flex w-full items-center gap-3 rounded-lg border-l-4 px-3 py-3 text-left transition",
            isParentActive
              ? "border-l-primary bg-primary/10 text-primary shadow-sm"
              : "border-l-transparent text-gray-600 hover:border-l-gray-300 hover:bg-gray-100 hover:text-primary",
            collapsed && "justify-center px-2.5",
          )}
          style={!collapsed ? { paddingLeft: `${0.75 + level * 0.85}rem` } : undefined}
        >
          <Icon className={cn("size-5 shrink-0", isParentActive ? "text-primary" : "text-gray-400")} />
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-extrabold">{item.label}</span>
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
            "flex items-center gap-3 rounded-lg border-l-4 px-3 py-3 transition",
            isActive
              ? "border-l-primary bg-primary/10 text-primary shadow-sm"
              : "border-l-transparent text-gray-600 hover:border-l-gray-300 hover:bg-gray-100 hover:text-primary",
            collapsed && "justify-center px-2.5",
          )
        }
      style={!collapsed ? { paddingLeft: `${0.75 + level * 0.85}rem` } : undefined}
    >
      <Icon className={cn("size-5 shrink-0", isActive ? "text-primary" : "text-gray-400")} />
      {!collapsed ? <span className="truncate text-sm font-extrabold">{item.label}</span> : null}
    </NavLink>
  );
}

export function SidebarExplorer({
  title,
  subtitle,
  actorLabel,
  items,
  autoCollapse = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: {
  title: string;
  subtitle: string;
  actorLabel: string;
  items: ExplorerNavItem[];
  autoCollapse?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const location = useLocation();
  const pathname = location.pathname;
  const storageKey = `sidebar-explorer:${actorLabel}:${title}`;
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(controlledCollapsed ?? false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const isControlled = controlledCollapsed !== undefined;
  const actualCollapsed = isControlled ? controlledCollapsed : collapsed;
  const isCollapsed = actualCollapsed;

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
      if (!isControlled) {
        setCollapsed(parsed.collapsed ?? false);
      }
      setExpandedNodes(parsed.expandedNodes ?? {});
    } catch {
      // Ignore invalid persisted sidebar state.
    }
  }, [isControlled, storageKey]);

  useEffect(() => {
    if (autoCollapse) {
      if (isControlled) {
        onCollapsedChange?.(true);
      } else {
        setCollapsed(true);
      }
    }
  }, [autoCollapse, isControlled, onCollapsedChange]);

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
        collapsed: actualCollapsed,
        expandedNodes,
      }),
    );
  }, [actualCollapsed, expandedNodes, storageKey]);

  function updateCollapsed(next: boolean | ((current: boolean) => boolean)) {
    const value = typeof next === "function" ? next(actualCollapsed) : next;
    if (isControlled) {
      onCollapsedChange?.(value);
      return;
    }
    setCollapsed(value);
  }

  function toggleNode(nodeId: string) {
    if (actualCollapsed) {
      updateCollapsed(false);
      return;
    }
    setExpandedNodes((current) => ({
      ...current,
      [nodeId]: !current[nodeId],
    }));
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden border-r border-gray-200 bg-white transition-all duration-300 lg:flex lg:flex-col",
        isCollapsed ? "lg:w-20" : "lg:w-80",
      )}
    >
      <div className={`flex items-center gap-3 border-b border-gray-200 px-4 py-4 ${isCollapsed ? "justify-center" : ""}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-extrabold text-white">
          O
        </div>
        {!isCollapsed ? (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{actorLabel}</p>
            <h2 className="text-lg font-extrabold text-text">{title}</h2>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => updateCollapsed((current) => !current)}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-primary"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      {!isCollapsed ? (
        <div className="border-b border-gray-200 px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Search navigation"
            />
          </div>
        </div>
      ) : null}

      <nav className={`flex flex-1 flex-col gap-5 overflow-y-auto py-4 ${isCollapsed ? "px-2" : "px-3"}`}>
        <section>
          {!isCollapsed ? (
            <div className="mb-2 px-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Navigation</p>
            </div>
          ) : null}
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
        </section>
      </nav>
    </aside>
  );
}
