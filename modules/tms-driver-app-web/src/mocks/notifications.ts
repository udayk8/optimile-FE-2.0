import type { AppNotification } from "@/types/notification";

export const mockNotifications: AppNotification[] = [
  {
    id: "n1",
    title: "Trip assigned",
    body: "Trip TRIP-1001 has been assigned to you.",
    priority: "HIGH",
    seen: false,
    timestamp: "2026-05-06T09:20:00",
    relatedTripId: "TRIP-1001",
  },
  {
    id: "n2",
    title: "Document expiring soon",
    body: "Medical certificate expires in 106 days.",
    priority: "MEDIUM",
    seen: false,
    timestamp: "2026-05-06T08:10:00",
  },
  {
    id: "n3",
    title: "Expense rejected",
    body: "Parking expense EXP-002 was rejected due to unreadable receipt.",
    priority: "HIGH",
    seen: false,
    timestamp: "2026-05-05T19:45:00",
    relatedTripId: "TRIP-1001",
  },
  {
    id: "n4",
    title: "Breakdown reported",
    body: "Critical incident INC-001 is linked to TRIP-1005.",
    priority: "CRITICAL",
    seen: true,
    timestamp: "2026-05-05T11:00:00",
    relatedTripId: "TRIP-1005",
  },
  {
    id: "n5",
    title: "Settlement ready",
    body: "Your trip settlement for TRIP-1001 is pending review.",
    priority: "LOW",
    seen: true,
    timestamp: "2026-05-04T19:45:00",
    relatedTripId: "TRIP-1001",
  },
];
