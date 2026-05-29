import type { PropsWithChildren } from "react";
import { Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { SidebarExplorer, type ExplorerNavItem } from "@/shared/components/layout/sidebar-explorer";
import { ThemeToggle } from "@/shared/components/layout/theme-toggle";
import { Input } from "@/shared/components/ui/input";

export function WorkspaceShell({
  title,
  subtitle,
  navItems,
  actorLabel,
  searchPlaceholder = "Search workspace records",
  children,
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  navItems: ExplorerNavItem[];
  actorLabel: string;
  searchPlaceholder?: string;
}>) {
  const location = useLocation();
  const bookingFocused = location.pathname.includes("/bookings");

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <SidebarExplorer title={title} subtitle={subtitle} actorLabel={actorLabel} items={navItems} autoCollapse={bookingFocused} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="app-shell-gradient sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/70 px-4 py-3.5 xl:px-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{actorLabel}</p>
              <div className="mt-1 flex items-center gap-2">
                <h1 className="text-[15px] font-semibold tracking-[-0.01em] xl:text-base">{title}</h1>
                {bookingFocused ? (
                  <span className="rounded-full border border-primary/15 bg-primary/[0.07] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                    Booking Workspace
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden min-w-[260px] xl:block">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-10 rounded-2xl border-border/80 bg-card/80 pl-9 shadow-sm" placeholder={searchPlaceholder} />
              </div>
              <ThemeToggle />
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
