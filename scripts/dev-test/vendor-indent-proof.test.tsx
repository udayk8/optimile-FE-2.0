/**
 * TEMPORARY runtime proof harness for the Vendor Indent → Accept → Assign flow.
 *
 * It mounts the REAL `MockStoreProvider` and drives the REAL store functions
 * (`sendBookingVendorIndent`, `respondBookingVendorIndent`, `assignTenantBooking`)
 * against real seed data, printing actual before/after state.
 *
 * NOTE on the target booking: BKG-2026-0004 / booking-nywzsi8 / tenant-bl001 are
 * user-created and live only in the browser's localStorage — unreachable from any
 * non-browser runtime. The flow logic is tenant-agnostic, so this harness proves
 * it on the seeded equivalent (tenant-northstar / booking-1, also
 * PENDING_ASSIGNMENT) where all dependencies (vendors, active vehicles/drivers,
 * LR config) are guaranteed. The executed code is identical.
 *
 * Delete this file + vitest.config.ts after proof.
 */
import { describe, it, expect } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MockStoreProvider, useMockStore } from "@/shared/store/mock-store";

let store: any = null;
function Capture() {
  store = useMockStore();
  return null;
}

const log = (...a: any[]) => console.log(...a);

describe("Vendor Indent runtime proof", () => {
  it("send indent → accept (first wins) → assign vehicle → VEHICLE_ASSIGNED", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <MockStoreProvider>
          <Capture />
        </MockStoreProvider>,
      );
    });
    expect(store).toBeTruthy();

    const tenantId = "tenant-northstar";
    const bookingPk = "booking-1";

    // Ensure ≥3 active vendors so first-accept-wins / close-others is exercised.
    // (Created via the REAL createTenantVendor store fn; ephemeral to this run.)
    await act(async () => {
      store.createTenantVendor({ tenantId, name: "SRS Logistics (proof)", status: "active" } as any);
      store.createTenantVendor({ tenantId, name: "Mahesh Transport (proof)", status: "active" } as any);
    });

    // ---- BEFORE ----
    const before = store.getTenantBookingById(bookingPk);
    expect(before, "seed booking present").toBeTruthy();
    log("\n================ VENDOR INDENT RUNTIME PROOF ================");
    log("Tenant:", tenantId, "(seed equivalent of tenant-bl001 — see file header)");
    log("Booking:", `${before.bookingId} / ${before.id}`);
    log("\nBefore:");
    log("  status:", before.status);
    log("  vendor:", before.assignment?.vendorId ?? "(none)");
    log("  vehicle:", before.assignment?.vehicleId ?? "(none)");
    log("  driver:", before.assignment?.driverId ?? "(none)");
    expect(before.status).toBe("PENDING_ASSIGNMENT");
    expect(before.assignment ?? null).toBeNull();

    // ---- STEP: SEND INDENT ----
    let created: any[] = [];
    await act(async () => {
      created = store.sendBookingVendorIndent(bookingPk, "Dispatcher (harness)");
    });
    let indents = store
      .listBookingVendorIndents(tenantId)
      .filter((i: any) => i.bookingId === bookingPk);
    log("\nAfter Send Indent:");
    log("  indentCount:", indents.length);
    log("  vendorsNotified:", indents.map((i: any) => i.vendorName).join(", "));
    log("  indentStatuses:", indents.map((i: any) => `${i.vendorName}:${i.status}`).join(", "));
    expect(created.length).toBeGreaterThan(0);
    expect(indents.length).toBe(created.length);
    expect(indents.every((i: any) => i.status === "PENDING")).toBe(true);

    // ---- pick a winning vendor that has an active vehicle + active driver ----
    const vehicles = store.listTenantVehicles(tenantId);
    const drivers = store.listTenantDrivers(tenantId);
    const eligibleFor = (vendorId: string) => {
      const veh = vehicles.find((v: any) => v.isActive && v.vendorId === vendorId);
      const drv = drivers.find((d: any) => d.isActive && d.vendorId === vendorId);
      return veh && drv ? { veh, drv } : null;
    };
    // prefer Mahesh Transport if present, else first eligible
    const ranked = [...indents].sort(
      (a, b) => (/mahesh/i.test(b.vendorName) ? 1 : 0) - (/mahesh/i.test(a.vendorName) ? 1 : 0),
    );
    let winnerIndent: any = null;
    let pick: any = null;
    for (const ind of ranked) {
      const e = eligibleFor(ind.vendorId);
      if (e) {
        winnerIndent = ind;
        pick = e;
        break;
      }
    }
    expect(winnerIndent, "a vendor with an active vehicle+driver exists").toBeTruthy();

    // ---- STEP: VENDOR ACCEPT (first wins) ----
    await act(async () => {
      store.respondBookingVendorIndent(winnerIndent.id, "ACCEPT");
    });
    indents = store
      .listBookingVendorIndents(tenantId)
      .filter((i: any) => i.bookingId === bookingPk);
    const winNow = indents.find((i: any) => i.id === winnerIndent.id);
    const others = indents.filter((i: any) => i.id !== winnerIndent.id);
    log("\nAfter Vendor Accept:");
    log("  winningVendor:", winNow.vendorName);
    log("  winnerIndentStatus:", `${winNow.status} (isWinner=${winNow.isWinner})`);
    log("  otherIndentStatuses:", others.map((i: any) => `${i.vendorName}:${i.status}`).join(", ") || "(none)");
    expect(winNow.status).toBe("ACCEPTED");
    expect(winNow.isWinner).toBe(true);
    expect(others.every((i: any) => i.status === "CLOSED")).toBe(true);

    // late accept by another vendor must be rejected
    if (others.length > 0) {
      let lateErr = "";
      try {
        store.respondBookingVendorIndent(others[0].id, "ACCEPT");
      } catch (e) {
        lateErr = (e as Error).message;
      }
      log("  lateAcceptByOtherVendor:", lateErr || "(no error — UNEXPECTED)");
      expect(lateErr).toMatch(/no longer open|already accepted/i);
    }

    // ---- STEP: VENDOR ASSIGNS VEHICLE + DRIVER ----
    await act(async () => {
      store.assignTenantBooking(bookingPk, {
        vendorId: winnerIndent.vendorId,
        vendorName: winnerIndent.vendorName,
        vehicleId: pick.veh.id,
        vehicleLabel: pick.veh.registrationNumber,
        driverId: pick.drv.id,
        driverName: pick.drv.name,
        vendorFreight: before.pricing.calculatedFreight,
        customerFreight: before.pricing.calculatedFreight,
        actor: winnerIndent.vendorName,
      });
    });
    const after = store.getTenantBookingById(bookingPk);
    const assignedTrips = store
      .listTenantBookings(tenantId)
      .filter(
        (b: any) =>
          b.assignment?.vendorId === winnerIndent.vendorId &&
          ["VEHICLE_ASSIGNED", "IN_TRANSIT"].includes(b.status),
      );
    log("\nAfter Vehicle Assignment:");
    log("  bookingStatus:", after.status);
    log("  vendor:", after.assignment?.vendorName);
    log("  vehicle:", after.assignment?.vehicleLabel);
    log("  driver:", after.assignment?.driverName);
    log("  vendorAssignedTripsCount:", assignedTrips.length);
    log("  bookingDashboardStatus(raw):", after.status, "→ badge renders 'VEHICLE ASSIGNED' (ASSIGNED_SUB_STATUSES)");
    expect(after.status).toBe("VEHICLE_ASSIGNED");
    expect(after.assignment.vendorId).toBe(winnerIndent.vendorId);
    expect(after.assignment.vehicleId).toBe(pick.veh.id);
    expect(after.assignment.driverId).toBe(pick.drv.id);
    expect(assignedTrips.length).toBeGreaterThan(0);

    log("\nFinal Result: PASS");
    log("============================================================\n");
  });
});
