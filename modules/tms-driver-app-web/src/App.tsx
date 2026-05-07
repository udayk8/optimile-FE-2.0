import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/router/AppRouter";
import { ToastProvider } from "@/components/ui/Toast";
import i18next from "@/i18n/i18n";
import { useAppStore } from "@/store/useAppStore";

export default function App() {
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    i18next.changeLanguage(language);
  }, [language]);

  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </BrowserRouter>
  );
}
