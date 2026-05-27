import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import CustomerApp from "@customer/app/CustomerApp";

// Renders the customer portal inside the tenant shell using the default
// customer app export available on this branch.

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
      <CustomerApp />
    </div>
  );
}
