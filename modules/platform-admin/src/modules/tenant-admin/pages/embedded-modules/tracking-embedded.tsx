import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import TrackTraceApp from "@track-trace/app/TrackTraceApp";

// Real Track-and-Trace pages embedded inside the platform-admin tenant
// shell. Track-trace's own sidebar/header are hidden via the `embedded`
// prop; useTrackTraceRouting already builds scoped paths from the current
// location, so internal navigation stays under
// /platform-admin/tenant/:id/track-and-trace/...

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
      <TrackTraceApp embedded />
    </div>
  );
}
