import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import TrackTraceApp from "@track-trace/app/TrackTraceApp";

// Render the real track-trace module inside the tenant shell.

export function TrackingEmbeddedApp() {
  return (
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
  );
}
