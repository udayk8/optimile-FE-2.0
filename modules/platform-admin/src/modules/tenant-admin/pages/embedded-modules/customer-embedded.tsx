import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { CustomerDashboardEmbedded } from "@customer/app/CustomerApp";

// Renders the real Customer Portal pages inside the platform-admin tenant
// shell. The customer module's own sidebar/header are suppressed via the
// `embedded` prop so the tenant shell remains the only navigation.

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
      <CustomerDashboardEmbedded />
    </div>
  );
}
