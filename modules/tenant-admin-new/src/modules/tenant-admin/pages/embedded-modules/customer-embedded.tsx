import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { CustomerDashboardShell } from "@customer/app/CustomerBrdDashboard";
import { CustomerDataBridgeProvider } from "@customer/integration/customer-data-bridge";
import { useCustomerTenantDataBridge } from "@/modules/tenant-admin/integration/customer-bridge-adapter";

// Renders the customer portal inside the tenant shell. We embed the dashboard
// shell directly (not the standalone guarded app) because access is already
// authorized by the route-level PermissionGate (moduleCode="CUSTOMER").
//
// For a CUSTOMER session we inject the shared-data bridge so the dashboard's
// bookings and Create Booking read/write the SAME shared tenant booking store
// (scoped to the logged-in customer). Internal/admin previews get bridge=null
// and the dashboard shows its standalone demo data unchanged.

export function CustomerEmbeddedApp() {
  const bridge = useCustomerTenantDataBridge();
  const content = (
    <div>
      <div className="flex justify-end px-4 pt-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/customer" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" />
            Open standalone Customer Portal
          </Link>
        </Button>
      </div>
      <CustomerDashboardShell embedded />
    </div>
  );
  return bridge ? <CustomerDataBridgeProvider value={bridge}>{content}</CustomerDataBridgeProvider> : content;
}
