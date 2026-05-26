import { Badge } from "@/shared/components/ui/badge";
import { getPrimaryBookingStatus } from "@/modules/tms/booking/services/booking-engine";
import type { ReactNode } from "react";
import type { BookingRemark, BookingStatusEvent } from "@/modules/tms/booking/types";

export function BookingStatusTimeline({ events }: { events: BookingStatusEvent[] }) {
  const visibleEvents = events.filter((event, index) => {
    const current = getPrimaryBookingStatus(event.status);
    const previous = index > 0 ? getPrimaryBookingStatus(events[index - 1].status) : null;
    return current !== previous;
  });

  return (
    <div className="space-y-3">
      {visibleEvents.map((event) => (
        <div key={event.id} className="relative rounded-2xl border bg-background/80 px-4 py-4 pl-6">
          <div className="absolute left-3 top-5 h-full w-px bg-border/70 last:hidden" />
          <div className="absolute left-[7px] top-5 size-3 rounded-full bg-primary/90 ring-4 ring-primary/10" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline">{event.eventLabel ?? getPrimaryBookingStatus(event.status).replace(/_/g, " ")}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</span>
          </div>
          <p className="mt-2 text-sm font-medium">{event.actor}</p>
          {event.note ? <p className="mt-1 text-sm text-muted-foreground">{event.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function BookingRemarksTimeline({
  remarks,
  renderAction,
}: {
  remarks: BookingRemark[];
  renderAction?: (remark: BookingRemark) => ReactNode;
}) {
  return (
    <div className="space-y-3">
      {remarks.map((remark) => (
        <div key={remark.id} className="relative rounded-2xl border bg-background/80 px-4 py-4 pl-6">
          <div className="absolute left-3 top-5 h-full w-px bg-border/70 last:hidden" />
          <div className="absolute left-[7px] top-5 size-3 rounded-full bg-indigo-500 ring-4 ring-indigo-500/10" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="accent">{remark.type.replace(/_/g, " ")}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(remark.timestamp).toLocaleString()}</span>
          </div>
          <p className="mt-2 text-sm font-medium">{remark.actor}</p>
          <p className="mt-1 text-sm text-muted-foreground">{remark.message}</p>
          {renderAction ? <div className="mt-3">{renderAction(remark)}</div> : null}
        </div>
      ))}
    </div>
  );
}
