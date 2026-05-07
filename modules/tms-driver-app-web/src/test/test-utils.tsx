import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { AppRouter } from "@/router/AppRouter";
import "@/i18n/i18n";

export function renderApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </MemoryRouter>
  );
}
