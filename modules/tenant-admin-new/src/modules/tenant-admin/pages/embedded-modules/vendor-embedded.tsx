import { ExternalLink } from "lucide-react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Button } from "@/shared/components/ui/button";
import DashboardPage from "@vendor/features/home/pages/DashboardPage";
import TripsPage from "@vendor/features/trips/pages/TripsPage";
import TripDetailPage from "@vendor/features/trips/pages/TripDetailPage";
import SourcingPage from "@vendor/features/sourcing/pages/SourcingPage";
import AuctionDetailPage from "@vendor/features/sourcing/pages/AuctionDetailPage";
import ContractsPage from "@vendor/features/contracts/pages/ContractsPage";
import InvoicesPage from "@vendor/features/invoices/pages/InvoicesPage";
import InvoiceDetailPage from "@vendor/features/invoices/pages/InvoiceDetailPage";
import CreateInvoicePage from "@vendor/features/invoices/pages/CreateInvoicePage";
import LedgerPage from "@vendor/features/finance/pages/LedgerPage";
import PaymentsPage from "@vendor/features/finance/pages/PaymentsPage";
import FleetPage from "@vendor/features/fleet/pages/FleetPage";
import SupportHubPage from "@vendor/features/support/pages/SupportHubPage";
import { VendorRouteWrapper } from "@vendor/app/VendorRouteWrapper";

// Embedded mode renders the real Vendor module pages inside the
// platform-admin tenant shell. The standalone Vendor app's chrome
// (StandaloneShell with its own sidebar/header) is intentionally not
// included — the surrounding TenantLayout owns navigation.
//
// Vendor page business logic is untouched: pages, vendor auth/store, and
// UI components are imported as-is via the @vendor alias.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function StandaloneLink() {
  return (
    <div className="flex justify-end px-4 pt-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/vendor" target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-3.5" />
          Open standalone Vendor Portal
        </Link>
      </Button>
    </div>
  );
}

export function VendorEmbeddedApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <StandaloneLink />
      <VendorRouteWrapper>
        <Routes>
          {/* Tenant sidebar slugs → real vendor pages */}
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="assigned-trips" element={<TripsPage />} />
          <Route path="assigned-trips/:status/:id" element={<TripDetailPage />} />
          <Route path="sourcing" element={<SourcingPage />} />
          <Route path="sourcing/auctions/:id" element={<AuctionDetailPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="contracts/:id" element={<ContractsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/new" element={<CreateInvoicePage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="ledger" element={<LedgerPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="fleet" element={<FleetPage />} />
          <Route path="support" element={<SupportHubPage />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </VendorRouteWrapper>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
