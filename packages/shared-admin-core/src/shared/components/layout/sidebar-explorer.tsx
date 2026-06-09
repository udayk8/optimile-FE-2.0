import { useEffect, useMemo, useState, type ComponentType } from "react";
import { ChevronDown, ChevronRight, FolderTree, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

export interface ExplorerNavItem {
  id?: string;
  to?: string;
  label: string;
  title?: string;
  icon?: ComponentType<{ className?: string }>;
  pageCode?: string;
  children?: ExplorerNavItem[];
  matchMode?: "inclusive" | "exact" | "never";
  state?: unknown;
  onClick?: () => void;
  isActiveOverride?: boolean;
}

function getItemId(item: ExplorerNavItem, parentId?: string) {
  return item.id ?? `${parentId ?? "root"}:${item.label.toLowerCase().replace(/\s+/g, "-")}`;
}

function matchesPath(pathname: string, item: ExplorerNavItem) {
  if (item.isActiveOverride !== undefined) {
    return item.isActiveOverride;
  }
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
  const navigate = useNavigate();
  const itemId = getItemId(item, parentId);
  const hasChildren = Boolean(item.children?.length);
  const isExpanded = expandedNodes.has(itemId);
  const isActive = matchesPath(pathname, item);
  const isParentActive = hasActiveDescendant(pathname, item);
  const Icon = item.icon ?? FolderTree;

  if (hasChildren) {
    const Chevron = isExpanded ? ChevronDown : ChevronRight;

    // Single-click toggle:
    //   - collapsed  → expand AND navigate to the group's dashboard (`to`)
    //   - expanded   → collapse (no navigation)
    //   - collapsed  → expand AND navigate again
    // Groups without a `to` (e.g. Administration) just toggle.
    const handleHeaderClick = () => {
      if (isExpanded) {
        onToggle(itemId);
        return;
      }
      onToggle(itemId);
      if (item.to) {
        navigate(item.to, item.state ? { state: item.state } : undefined);
      }
    };

    return (
      <div className="space-y-1">
        <button
          type="button"
          title={item.title ?? (collapsed ? item.label : undefined)}
          aria-expanded={isExpanded}
          onClick={handleHeaderClick}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[15px] font-medium transition",
            isParentActive
              ? "bg-slate-100 text-slate-900"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            collapsed && "justify-center px-2",
          )}
          style={!collapsed ? { paddingLeft: `${0.75 + level * 0.85}rem` } : undefined}
        >
          <Icon className="size-4 shrink-0" />
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <Chevron className="size-4 shrink-0" />
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

  const className = cn(
    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[15px] font-medium transition",
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
    collapsed && "justify-center px-2",
  );

  if (item.onClick && !item.to) {
    return (
      <button
        type="button"
        title={item.title ?? (collapsed ? item.label : undefined)}
        onClick={item.onClick}
        className={className}
        style={!collapsed ? { paddingLeft: `${0.75 + level * 0.85}rem` } : undefined}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed ? <span className="truncate">{item.label}</span> : null}
      </button>
    );
  }

  return (
    <NavLink
      to={item.to ?? "#"}
      state={item.state}
      title={item.title ?? (collapsed ? item.label : undefined)}
      className={() => className}
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
  // `collapsed` is the PINNED state, toggled by the button and persisted.
  // `hoverExpanded` is a transient peek when the mouse is over a pinned-collapsed
  // sidebar. The effective (visible) state is `isCollapsed`.
  const [collapsed, setCollapsed] = useState(false);
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
      setCollapsed(parsed.collapsed ?? false);
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

  // The ids of the branch leading to the active route, as a stable string.
  // Content-based (not array identity) so it only changes when the active
  // branch actually changes — NOT on every parent re-render, which is what
  // re-expanded sections the moment the user collapsed them (the "stuck open"
  // bug). Recomputed inline; the nav tree is tiny.
  const activeBranchKey = collectExpandedIds(items, pathname).join("|");

  // When the active branch changes (route change, or items finishing loading),
  // open exactly that branch and close everything else. REPLACE (not merge) so
  // nothing stays stuck open after navigating away; manual expand/collapse made
  // between navigations is preserved because this key doesn't change then.
  useEffect(() => {
    setExpandedNodes(() => {
      const next: Record<string, boolean> = {};
      if (activeBranchKey) {
        activeBranchKey.split("|").forEach((id) => {
          next[id] = true;
        });
      }
      return next;
    });
  }, [activeBranchKey]);

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
    // In the icon rail (collapsed and not hover-peeking), the first click just
    // opens the sidebar — submenus aren't visible to toggle yet.
    if (isCollapsed) {
      setCollapsed(false);
      return;
    }
    setExpandedNodes((current) => {
      // Already open → collapse this node and everything beneath it.
      if (current[nodeId]) {
        const next: Record<string, boolean> = {};
        Object.keys(current).forEach((id) => {
          if (current[id] && id !== nodeId && !id.startsWith(`${nodeId}:`)) {
            next[id] = true;
          }
        });
        return next;
      }
      // Closed → open exactly the path to this node. Node ids are built as
      // `parent:child:…`, so each `:`-prefix is an ancestor. Opening only the
      // ancestor path closes sibling and unrelated branches at every level —
      // i.e. one expanded section at a time, no duplicates.
      const next: Record<string, boolean> = {};
      const segments = nodeId.split(":");
      for (let depth = 2; depth <= segments.length; depth += 1) {
        next[segments.slice(0, depth).join(":")] = true;
      }
      return next;
    });
  }

  return (
    <aside
      // Collapse/expand is controlled ONLY by the toggle button — no hover peek.
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-border/70 bg-gradient-to-b from-slate-50/92 via-white to-slate-50/88 transition-all duration-200 lg:flex lg:flex-col",
        isCollapsed ? "w-[74px]" : "w-[272px]",
      )}
    >
      <div className="border-b border-border/75 bg-white/55 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          {!isCollapsed ? (
            <div>
              <div className="inline-flex rounded-full border border-primary/10 bg-primary/[0.08] px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-primary">
                {actorLabel}
              </div>
              <h2 className="mt-2 text-[19px] font-semibold leading-tight tracking-[-0.01em]">{title}</h2>
              <p className="mt-1 max-w-[26ch] whitespace-pre-line text-[14px] leading-5 text-muted-foreground">{subtitle}</p>
            </div>
          ) : (
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/10 bg-primary/[0.08] text-primary">
              <FolderTree className="size-5" />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              // Toggle the PINNED state and drop any transient hover-peek so the
              // explicit click always wins: peek + click pins open; clicking
              // collapse stays collapsed even while the cursor is over it.
              setHoverExpanded(false);
              setCollapsed((current) => !current);
            }}
            className="rounded-2xl border border-border/80 bg-card/90 p-2 text-slate-600 transition hover:border-primary/25 hover:bg-primary/[0.045] hover:text-slate-950"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        {!isCollapsed ? (
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 rounded-2xl border-border/80 bg-card/80 pl-9 text-[15px]"
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
