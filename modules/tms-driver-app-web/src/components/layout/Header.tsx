import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NotificationBadge } from "@/components/NotificationBadge";
import { Link, useNavigate } from "react-router-dom";
import { routes } from "@/router/routes";
import { useAppStore } from "@/store/useAppStore";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const { onDuty, notifications, toggleOnDuty } = useAppStore();
  const unreadCount = notifications.filter((item) => !item.seen).length;

  return (
    <header className="topbar-shell">
      <div className="topbar">
        <Button variant="ghost" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={18} />
        </Button>
        <Link className="brand-center brand-link" to={routes.dashboard}>
          <div className="brand-mark">O</div>
          <div>
            <div className="brand-title">Optimile</div>
            <div className="brand-subtitle">Driver execution</div>
          </div>
        </Link>
        <div className="row">
          <button className={`duty-toggle ${onDuty ? "active" : ""}`} onClick={toggleOnDuty} aria-label="Toggle on duty">
            <span className="duty-toggle-knob" />
          </button>
          <span className="topbar-duty-label">{onDuty ? "On duty" : "Off duty"}</span>
          <Button variant="ghost" onClick={() => navigate(routes.notifications)} aria-label="Notifications">
            <Bell size={18} />
            <NotificationBadge count={unreadCount} />
          </Button>
        </div>
      </div>
    </header>
  );
}
