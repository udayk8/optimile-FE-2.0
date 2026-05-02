import { Badge } from "../../../../components/ui/badge";
import type { BookingRemark, BookingStatusEvent } from "../types";

export function BookingStatusTimeline({ events }: { events: BookingStatusEvent[] }) {
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="relative rounded-xl border border-gray-200 bg-white px-4 py-4 pl-6">
          <div className="absolute left-3 top-5 h-full w-px bg-border/70 last:hidden" />
          <div className="absolute left-[7px] top-5 size-3 rounded-full bg-primary/90 ring-4 ring-primary/10" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline">{event.status.replace(/_/g, " ")}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</span>
          </div>
          <p className="mt-2 text-sm font-medium">{event.actor}</p>
          {event.note ? <p className="mt-1 text-sm text-muted-foreground">{event.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function BookingRemarksTimeline({ remarks }: { remarks: BookingRemark[] }) {
  return (
    <div className="space-y-3">
      {remarks.map((remark) => (
        <div key={remark.id} className="relative rounded-xl border border-gray-200 bg-white px-4 py-4 pl-6">
          <div className="absolute left-3 top-5 h-full w-px bg-border/70 last:hidden" />
          <div className="absolute left-[7px] top-5 size-3 rounded-full bg-indigo-500 ring-4 ring-indigo-500/10" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="accent">{remark.type.replace(/_/g, " ")}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(remark.timestamp).toLocaleString()}</span>
          </div>
          <p className="mt-2 text-sm font-medium">{remark.actor}</p>
          <p className="mt-1 text-sm text-muted-foreground">{remark.message}</p>
        </div>
      ))}
    </div>
  );
}
