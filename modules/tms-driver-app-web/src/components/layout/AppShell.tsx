import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-page">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="mobile-shell">
        <Header onMenuClick={() => setOpen(true)} />
        <main className="app-main">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
