import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Button } from "@/shared/components/ui/button";
import DashboardPage from "@auction/features/dashboard/pages/DashboardPage";
import AuctionsPage from "@auction/features/auctions/pages/AuctionsPage";
import AuctionCreatePage from "@auction/features/auctions/pages/AuctionCreatePage";
import AuctionDetailPage from "@auction/features/auctions/pages/AuctionDetailPage";
import ContractsPage from "@auction/features/contracts/pages/ContractsPage";
import SourcingPage from "@auction/features/sourcing/pages/SourcingPage";
import RfiCreatePage from "@auction/features/sourcing/pages/RfiCreatePage";
import RfiDetailPage from "@auction/features/sourcing/pages/RfiDetailPage";
import RfqCreatePage from "@auction/features/sourcing/pages/RfqCreatePage";
import RfqDetailPage from "@auction/features/sourcing/pages/RfqDetailPage";
import RfqResponsesPage from "@auction/features/sourcing/pages/RfqResponsesPage";
import { AuctionRouteWrapper } from "@auction/app/AuctionRouteWrapper";
import { AuctionPermissionProvider } from "@auction/app/permission-context";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";

// Embedded mode renders the real Auction module pages inside the
// platform-admin tenant shell. The standalone Auction app's chrome
// (StandaloneShell with its own sidebar/header) is intentionally not
// included — the surrounding TenantLayout owns navigation.
//
// Auction page business logic is not touched: data, actions, and UI
// components are imported as-is via the @auction alias.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function StandaloneLink() {
  return (
    <div className="flex justify-end px-4 pt-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/auction/dashboard" target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-3.5" />
          Open standalone Auction Portal
        </Link>
      </Button>
    </div>
  );
}

export function AuctionEmbeddedApp() {
  const access = useTenantAccess();
  const permissions = useMemo(
    () => ({
      canCreateAuction: access.hasFeaturePermission("AUCTION", "CREATE_AUCTION", "create"),
      canCreateRfi: access.hasFeaturePermission("AUCTION", "CREATE_RFI", "create"),
      canCreateRfq: access.hasFeaturePermission("AUCTION", "CREATE_RFQ", "create"),
    }),
    [access],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuctionPermissionProvider value={permissions}>
        <StandaloneLink />
        <AuctionRouteWrapper>
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="sourcing" element={<SourcingPage />} />
            <Route path="sourcing/rfi/new" element={<RfiCreatePage />} />
            <Route path="sourcing/rfi/:id" element={<RfiDetailPage />} />
            <Route path="sourcing/rfq/new" element={<RfqCreatePage />} />
            <Route path="sourcing/rfq/:id" element={<RfqDetailPage />} />
            <Route path="rfq-responses" element={<RfqResponsesPage />} />
            <Route path="auctions" element={<AuctionsPage />} />
            <Route path="auctions/new" element={<AuctionCreatePage />} />
            <Route path="auctions/new/:type" element={<AuctionCreatePage />} />
            <Route path="auctions/:id" element={<AuctionDetailPage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="contracts/:id" element={<ContractsPage />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </AuctionRouteWrapper>
        <Toaster position="top-right" richColors closeButton />
      </AuctionPermissionProvider>
    </QueryClientProvider>
  );
}
