import { NavLink } from "react-router-dom";
import { routes } from "@/router/routes";
import { Home, Route, Sparkles } from "lucide-react";

const items = [
  { to: routes.dashboard, label: "Home", icon: Home },
  { to: routes.trips, label: "MyTrips", icon: Route },
  { to: routes.poi, label: "Interest", icon: Sparkles },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === routes.dashboard}
            className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
