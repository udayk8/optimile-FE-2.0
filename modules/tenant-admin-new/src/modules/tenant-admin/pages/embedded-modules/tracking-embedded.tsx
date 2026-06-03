import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import TrackTraceApp from "@track-trace/app/TrackTraceApp";
import { TrackTraceEmbeddedProvider } from "@track-trace/app/embedded-context";
import { useTrackingTenantDataBridge } from "@/modules/tenant-admin/integration/tracking-bridge-adapter";

// Render the real track-trace module inside the tenant shell. The provider
// signals embedded mode so TrackTraceLayout suppresses its own sidebar/header
// and the tenant's outer sidebar drives navigation.

export function TrackingEmbeddedApp() {
  // Bridge: mirror the tenant's In-Transit bookings/deliveries into the
  // track-trace data registry so they appear as real trips. Runs only while
  // embedded; standalone Track-and-Trace keeps its mock trips.
  useTrackingTenantDataBridge();

  return (
    <TrackTraceEmbeddedProvider>
      <div>
        <div className="flex justify-end px-4 pt-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/tracking" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              Open standalone Track and Trace Portal
            </Link>
          </Button>
        </div>
        <TrackTraceApp />
      </div>
    </TrackTraceEmbeddedProvider>
  );
}
