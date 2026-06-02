import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { CustomerDashboardShell } from "@customer/app/CustomerBrdDashboard";

// Renders the customer portal inside the tenant shell. We embed the dashboard
// shell directly (not the standalone guarded app) because access is already
// authorized by the route-level PermissionGate (moduleCode="CUSTOMER").

export function CustomerEmbeddedApp() {
  return (
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
}
