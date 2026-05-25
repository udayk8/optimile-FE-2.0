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
import { AuctionRouteWrapper } from "@auction/app/AuctionRouteWrapper";

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
  return (
    <QueryClientProvider client={queryClient}>
      <StandaloneLink />
      <AuctionRouteWrapper>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
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
    </QueryClientProvider>
  );
}
