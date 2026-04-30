import { Bell, Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b bg-background/85 px-6 py-4 backdrop-blur-sm">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Optimile Admin</p>
        <h1 className="mt-1 text-lg font-semibold">Platform workspace</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden min-w-[280px] lg:block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search tenants, users, or modules" />
        </div>
        <Button variant="outline" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
