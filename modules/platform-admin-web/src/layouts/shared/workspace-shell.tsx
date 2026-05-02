import { useState, type PropsWithChildren } from "react";
import { ChevronDown, LogOut, Menu, Search } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@shared-auth";
import { SidebarExplorer, type ExplorerNavItem } from "../../components/layout/sidebar-explorer";
import { ThemeToggle } from "../../components/layout/theme-toggle";
import { Input } from "../../components/ui/input";

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
  const { logout } = useAuth();
  const bookingFocused = location.pathname.includes("/bookings");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.assign("/login");
  };

  return (
    <div className="min-h-screen bg-background text-text">
      <SidebarExplorer
        title={title}
        subtitle={subtitle}
        actorLabel={actorLabel}
        items={navItems}
        autoCollapse={bookingFocused}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={`min-h-screen transition-[padding] duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-80"}`}>
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
                onClick={() => setMobileOpen((current) => !current)}
                type="button"
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{actorLabel}</p>
                <div className="mt-1 flex items-center gap-2">
                  <h1 className="truncate text-lg font-bold text-text">{title}</h1>
                  {bookingFocused ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      Booking Workspace
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden min-w-[260px] md:block">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                <Input className="pl-9" placeholder={searchPlaceholder} />
              </div>
              <ThemeToggle />
              <button
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-primary"
                onClick={handleLogout}
                title="Sign out"
                type="button"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
          {mobileOpen ? (
            <nav className="border-t border-gray-200 bg-white p-3 lg:hidden">
              <div className="mb-2 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Screens
                <ChevronDown className="size-4" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to ?? item.label}
                    to={item.to ?? "#"}
                    state={item.state}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                      item.to && (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
                        ? "bg-primary text-white"
                        : "bg-gray-50 text-gray-700"
                    }`}
                  >
                    {item.icon ? <item.icon className="size-4" /> : null}
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </nav>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}
