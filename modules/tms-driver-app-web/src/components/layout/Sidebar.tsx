import {
  Check,
  ChevronDown,
  CircleHelp,
  FileText,
  Globe,
  Home,
  Info,
  LogOut,
  MessageCircle,
  Route,
  Shield,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import i18next from "@/i18n/i18n";
import { routes } from "@/router/routes";
import { useAppStore } from "@/store/useAppStore";
import type { AppLanguage } from "@/store/useAppStore";

const items = [
  { label: "Home", icon: Home, route: routes.dashboard },
  { label: "My Trips", icon: Route, route: routes.trips },
  { label: "Interest", icon: Sparkles, route: routes.poi },
  { label: "Documents", icon: FileText, route: routes.documents },
  { label: "About the app", icon: Info },
  { label: "Support", icon: MessageCircle },
  { label: "Disclaimer", icon: CircleHelp },
  { label: "Terms of service", icon: Wrench },
  { label: "Privacy policy", icon: Shield },
  { label: "Logout", icon: LogOut },
];

const languageOptions: { value: AppLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ta", label: "Tamil" },
  { value: "kn", label: "Kannada" },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { driver, language, setLanguage } = useAppStore();
  const [languageOpen, setLanguageOpen] = useState(false);

  return (
    <>
      <div className={`sidebar-backdrop ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`sidebar drawer ${open ? "open" : ""}`}>
        <div className="space-between">
          <div className="drawer-profile">
            <div className="drawer-avatar">{driver.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="brand-title">{driver.name.toUpperCase()}</div>
              <div className="brand-subtitle">{driver.mobile}</div>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <div className="drawer-section">
            <button className="drawer-link drawer-link-toggle" onClick={() => setLanguageOpen((current) => !current)}>
              <span className="row">
                <Globe size={18} />
                App Language
              </span>
              <ChevronDown size={16} className={languageOpen ? "chevron-open" : ""} />
            </button>
            {languageOpen ? (
              <div className="language-options">
                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`language-option ${language === option.value ? "language-option-active" : ""}`}
                    onClick={() => {
                      setLanguage(option.value);
                      i18next.changeLanguage(option.value);
                    }}
                  >
                    <span>{option.label}</span>
                    {language === option.value ? <Check size={16} /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="drawer-link"
                onClick={() => {
                  onClose();
                  if (item.route) navigate(item.route);
                }}
              >
                <span className="row">
                  <Icon size={18} />
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
