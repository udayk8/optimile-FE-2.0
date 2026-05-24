import type { PropsWithChildren, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SidebarExplorer, type ExplorerNavItem } from "@/shared/components/layout/sidebar-explorer";
import { ThemeToggle } from "@/shared/components/layout/theme-toggle";

export function WorkspaceShell({
  title,
  subtitle,
  navItems,
  actorLabel,
  headerTitle,
  headerRight,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  navItems: ExplorerNavItem[];
  actorLabel: string;
  searchPlaceholder?: string;
  headerTitle?: string;
  headerRight?: ReactNode;
}>) {
  const location = useLocation();
  const bookingFocused = location.pathname.includes("/bookings");
  const resolvedHeaderTitle = headerTitle ?? title;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <SidebarExplorer title={title} subtitle={subtitle} actorLabel={actorLabel} items={navItems} autoCollapse={bookingFocused} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/70 bg-card/95 px-5 py-3 backdrop-blur xl:px-6">
            <div className="flex items-center gap-3">
              <h1 className="text-[14px] font-semibold tracking-[-0.01em] text-slate-900">{resolvedHeaderTitle}</h1>
              {bookingFocused ? (
                <span className="rounded-full border border-primary/15 bg-primary/[0.07] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                  Booking Workspace
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {headerRight}
              <ThemeToggle />
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
