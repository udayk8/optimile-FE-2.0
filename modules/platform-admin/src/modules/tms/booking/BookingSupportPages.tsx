import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import { CircleCheckBig, Printer, RadioTower, TriangleAlert } from "lucide-react";
import { DataTable } from "@/shared/components/common/data-table";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantSummaryCard } from "@/modules/tenant-admin/components/tenant-primitives";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Tabs } from "@/shared/components/ui/tabs";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useSessionContext } from "@/shared/auth/session-context";
import { BookingStatusBadge } from "@/modules/tms/booking/components/BookingStatusBadge";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantFinance } from "./hooks/useTenantFinance";
import { useTenantBookings } from "./hooks/useTenantBookings";
import { useTenantRoles } from "@/modules/tenant-admin/hooks/useTenantRoles";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { getPrimaryBookingStatus, isBookingDelayCandidate } from "@/modules/tms/booking/services/booking-engine";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildDriverLookup,
} from "@/modules/tms/booking/services/booking-selectors";
import { formatCurrency } from "@/shared/lib/format-currency";
import { canAccessTenantPath } from "@/shared/lib/tenant-rbac";
import type { BookingRecord, TenantInvoiceRecord } from "@/modules/tms/booking/types";

export function LiveTrackingPlaceholderPage() {
  const navigate = useNavigate();
  const { tenant } = useTenantRouteContext();
  const { data: bookings } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );
  const driverMap = useMemo(() => buildDriverLookup(adminSources.drivers), [adminSources.drivers]);
  const controlTowerBookings = bookings.filter((booking) =>
    ["IN_TRANSIT", "EXCEPTION"].includes(getPrimaryBookingStatus(booking.status)),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title="In Transit / Control Tower"
        description="Operations board for active trips, delay signals, exception handling, and live execution visibility."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <TenantSummaryCard label="Active Trips" value={String(controlTowerBookings.length)} helper="Ready for dispatch and moving" />
        <TenantSummaryCard label="In Transit" value={String(controlTowerBookings.filter((booking) => getPrimaryBookingStatus(booking.status) === "IN_TRANSIT").length)} helper="Moving bookings" />
        <TenantSummaryCard label="Exceptions" value={String(controlTowerBookings.filter((booking) => getPrimaryBookingStatus(booking.status) === "EXCEPTION").length)} helper="Need intervention" />
        <TenantSummaryCard label="Delay Candidates" value={String(controlTowerBookings.filter((booking) => isBookingDelayCandidate(booking)).length)} helper="Auto-flagged risk" />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <SignalCard icon={RadioTower} title="Track operationally" description="Use booking details as the command center for transit, expenses, and delivery." />
        <SignalCard icon={TriangleAlert} title="Raise fast exceptions" description="Delay and exception signals stay visible without cluttering the board." />
        <SignalCard icon={CircleCheckBig} title="Close cleanly" description="Completed bookings continue to finance with clear downstream steps." />
      </div>

      <DataTable
        title="Control Tower Board"
        description="Minimal high-signal table. Click row to open booking workspace."
        headers={["Booking", "Customer", "Lane", "Status", "Vehicle", "Driver", "Signals", "Action"]}
        rows={controlTowerBookings.map((booking) => {
          const customer = customerMap.get(booking.customerId);
          const source = addressMap.get(booking.sourceAddressId);
          const destination = addressMap.get(booking.destinationAddressId);
          const driver = booking.assignment?.driverId ? driverMap.get(booking.assignment.driverId) : null;

          return [
            booking.bookingId,
            customer?.name ?? "Unknown customer",
            `${source?.addressName ?? "Source"} â†’ ${destination?.addressName ?? "Destination"}`,
            <BookingStatusBadge key={`${booking.id}-status`} status={booking.status} />,
            booking.assignment?.vehicleLabel ?? "Unassigned",
            booking.assignment?.driverName ?? driver?.name ?? "Unassigned",
            <Badge key={`${booking.id}-signal`} variant={isBookingDelayCandidate(booking) && booking.status !== "DELAYED" ? "warning" : "success"}>
              {isBookingDelayCandidate(booking) && booking.status !== "DELAYED" ? "Delay candidate" : "Normal"}
            </Badge>,
            <div key={`${booking.id}-actions`} onClick={(event) => event.stopPropagation()}>
              <Button asChild size="sm" variant="ghost">
                <Link to={`/tenant/${tenant.id}/bookings/${booking.id}`}>Open</Link>
              </Button>
            </div>,
          ];
        })}
        onRowClick={(rowIndex) => navigate(`/tenant/${tenant.id}/bookings/${controlTowerBookings[rowIndex].id}`)}
        emptyMessage="No dispatched or in-transit bookings are active right now."
      />
    </div>
  );
}

export function PODCompletedPage() {
  const navigate = useNavigate();
  const { tenant } = useTenantRouteContext();
  const access = useTenantAccess("/tenant/:tenantId/bookings/invoicing");
  const { data: bookings, transitionBooking } = useTenantBookings(tenant.id);
  const { data: invoices } = useTenantFinance(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const customerMap = buildCustomerLookup(adminSources.customers);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const invoicingBookings = bookings.filter((booking) =>
    ["POD_PENDING", "COMPLETED", "INVOICED"].includes(getPrimaryBookingStatus(booking.status)),
  );
  const completedBookings = invoicingBookings.filter((booking) => getPrimaryBookingStatus(booking.status) === "COMPLETED");

  function toggleBookingSelection(bookingId: string) {
    setSelectedBookingIds((current) =>
      current.includes(bookingId) ? current.filter((id) => id !== bookingId) : [...current, bookingId],
    );
  }

  function generateInvoices() {
    completedBookings
      .filter((booking) => selectedBookingIds.includes(booking.id))
      .forEach((booking) => {
        transitionBooking(booking.id, {
          status: "INVOICED",
          actor: "Finance",
          note: "Generated from invoicing screen.",
        });
      });
    setSelectedBookingIds([]);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title="Invoicing Screen"
        description="Finance workspace for selecting completed bookings and moving them to invoiced."
        action={
          access.can("BOOKING_INVOICING", "GENERATE_INVOICE") ? (
            <Button onClick={generateInvoices} disabled={!selectedBookingIds.length}>
              Generate Invoice
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <TenantSummaryCard label="POD Pending" value={String(invoicingBookings.filter((booking) => getPrimaryBookingStatus(booking.status) === "POD_PENDING").length)} helper="Physical delivery done, POD pending" />
        <TenantSummaryCard label="Completed" value={String(invoicingBookings.filter((booking) => getPrimaryBookingStatus(booking.status) === "COMPLETED").length)} helper="POD complete, ready for finance invoice" />
        <TenantSummaryCard label="Invoiced" value={String(invoicingBookings.filter((booking) => getPrimaryBookingStatus(booking.status) === "INVOICED").length)} helper="Moved to finance closure" />
        <TenantSummaryCard label="Paid" value={String(bookings.filter((booking) => booking.status === "PAID").length)} helper="Commercially closed" />
        <TenantSummaryCard label="POD Complete" value={String(invoicingBookings.filter((booking) => (booking.deliveries ?? []).every((delivery) => Boolean(delivery.pod?.capturedAt))).length)} helper="All delivery PODs saved" />
      </div>

      <DataTable
        title="Finance Selection Board"
        description="Select completed bookings for invoicing, or open a booking to inspect POD details."
        headers={["Select", "Booking", "Customer", "Status", "Invoice ID", "Invoiced", "POD Progress", "e-Sign", "Action"]}
        rows={invoicingBookings.map((booking) => {
          const deliveryCount = booking.deliveries?.length ?? 0;
          const completedCount = (booking.deliveries ?? []).filter((delivery) => Boolean(delivery.pod?.capturedAt)).length;
          const primaryStatus = getPrimaryBookingStatus(booking.status);
          const selectable = primaryStatus === "COMPLETED";

          return [
            <div key={`${booking.id}-select`} onClick={(event) => event.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedBookingIds.includes(booking.id)}
                disabled={!selectable}
                onChange={() => toggleBookingSelection(booking.id)}
              />
            </div>,
            booking.bookingId,
            customerMap.get(booking.customerId)?.name ?? "Unknown customer",
            <BookingStatusBadge key={`${booking.id}-status`} status={booking.status} />,
            booking.invoiceId ?? "-",
            booking.isInvoiced ? "Yes" : "No",
            deliveryCount ? `${completedCount}/${deliveryCount} deliveries` : booking.pod?.capturedAt ? "Completed" : "Pending",
            booking.pod?.eSignRequested || (booking.deliveries ?? []).some((delivery) => delivery.pod?.eSignRequested) ? "Requested" : "Ready",
            <div key={`${booking.id}-actions`} onClick={(event) => event.stopPropagation()} className="flex gap-2">
              <Button asChild size="sm" variant="ghost">
                <Link to={`/tenant/${tenant.id}/bookings/${booking.id}`}>Open</Link>
              </Button>
              {booking.invoiceId && invoices.some((invoice) => invoice.invoiceId === booking.invoiceId) ? (
                access.can("BOOKING_INVOICING", "VIEW_INVOICE") ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/tenant/${tenant.id}/finance/invoice/${booking.invoiceId}`}>View Invoice</Link>
                  </Button>
                ) : null
              ) : null}
            </div>,
          ];
        })}
        onRowClick={(rowIndex) => navigate(`/tenant/${tenant.id}/bookings/${invoicingBookings[rowIndex].id}`)}
        emptyMessage="No completed or invoiced bookings are available yet."
      />
    </div>
  );
}

export function FinanceWorkspacePage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const access = useTenantAccess(pathname);
  const adminSources = useBookingAdminSources(tenant.id);
  const { data: bookings, updateBooking, transitionBooking } = useTenantBookings(tenant.id);
  const { data: invoices, createInvoice } = useTenantFinance(tenant.id);
  const { data: users } = useTenantUsers(tenant.id);
  const { data: roles } = useTenantRoles(tenant.id);
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const currentTenantUser =
    users.find((user) => user.name === session.actorName || user.email === session.actorName) ?? null;
  const currentRole = currentTenantUser ? roles.find((role) => role.id === currentTenantUser.roleId) ?? null : null;
  const allowInvoiceWorkspace = pathname.endsWith("/bookings/invoicing");
  const canAccessFinanceWorkspace =
    allowInvoiceWorkspace ||
    (currentRole
      ? canAccessTenantPath({
          tenant,
          pathname: `/tenant/${tenant.id}/finance`,
          role: currentRole,
          rolePermissions: [],
        }).allowed || /finance|account/i.test(currentRole.name)
      : false);
  const financeCustomers = useMemo(
    () =>
      adminSources.customers.filter((customer) =>
        bookings.some((booking) => booking.customerId === customer.id),
      ),
    [adminSources.customers, bookings],
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(financeCustomers[0]?.id ?? "");
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("Invoice Workspace");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  useEffect(() => {
    if (!selectedCustomerId && financeCustomers[0]?.id) {
      setSelectedCustomerId(financeCustomers[0].id);
    }
  }, [financeCustomers, selectedCustomerId]);

  const customerBookings = bookings.filter((booking) => booking.customerId === selectedCustomerId);
  const invoicePendingBookings = customerBookings.filter(
    (booking) => booking.status === "COMPLETED" && !booking.isInvoiced,
  );
  const invoicedBookings = customerBookings.filter(
    (booking) => booking.isInvoiced || booking.status === "INVOICED",
  );
  const selectedBookings = invoicePendingBookings.filter((booking) => selectedBookingIds.includes(booking.id));
  const invoiceRows = selectedBookings.map((booking) => {
    const expenses = (booking.expenses ?? []).reduce((sum, expense) => sum + expense.amount, 0);
    const freight = booking.pricing.calculatedFreight;
    return {
      booking,
      freight,
      expenses,
      lineTotal: freight + expenses,
    };
  });
  const draftInvoiceId = useMemo(
    () => `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(invoices.length + 1).padStart(4, "0")}`,
    [invoices.length],
  );
  const subtotal = invoiceRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const cgst = Number((subtotal * 0.09).toFixed(2));
  const sgst = Number((subtotal * 0.09).toFixed(2));
  const total = Number((subtotal + cgst + sgst).toFixed(2));
  const customerInvoices = invoices
    .filter((invoice) => invoice.customerId === selectedCustomerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const selectedInvoice = customerInvoices.find((invoice) => invoice.invoiceId === selectedInvoiceId) ?? customerInvoices[0] ?? null;

  function toggleBookingSelection(bookingId: string) {
    setSelectedBookingIds((current) =>
      current.includes(bookingId) ? current.filter((id) => id !== bookingId) : [...current, bookingId],
    );
  }

  function generateInvoice() {
    if (!selectedCustomerId || !selectedBookings.length) {
      return;
    }
    const invoiceId = draftInvoiceId;
    createInvoice({
      invoiceId,
      tenantId: tenant.id,
      customerId: selectedCustomerId,
      bookingIds: selectedBookings.map((booking) => booking.id),
      subtotal,
      cgst,
      sgst,
      total,
      createdAt: new Date().toISOString(),
    });

    selectedBookings.forEach((booking) => {
      updateBooking(booking.id, {
        isInvoiced: true,
        invoiceId,
      });
      transitionBooking(booking.id, {
        status: "INVOICED",
        actor: "Finance",
        note: `Finance invoice ${invoiceId} generated.`,
      });
    });
    setSelectedBookingIds([]);
    setActiveTab("Generated Invoices");
    setSelectedInvoiceId(invoiceId);
  }

  function downloadInvoicePdf(invoiceIdValue: string) {
    const invoice = invoices.find((item) => item.invoiceId === invoiceIdValue);
    if (!invoice) {
      return;
    }
    const invoiceBookings = invoice.bookingIds
      .map((bookingId) => bookings.find((booking) => booking.id === bookingId) ?? null)
      .filter((booking): booking is BookingRecord => Boolean(booking));
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 42;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("EasyLane Transport", 40, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    y += 18;
    pdf.text("161, Basavanagar Main Rd, Bengaluru, Karnataka - 560037", 40, y);
    y += 14;
    pdf.text("GSTIN: XXXXXXXXXXXXXX | PAN No. - XXXXXXXXX", 40, y);
    pdf.setFont("helvetica", "bold");
    pdf.text("INVOICE", pageWidth - 100, 42);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Invoice No: ${invoice.invoiceId}`, pageWidth - 200, 62);
    pdf.text(`Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, pageWidth - 200, 78);

    y = 120;
    pdf.setFont("helvetica", "bold");
    pdf.text("Booking ID", 40, y);
    pdf.text("Freight", pageWidth - 200, y, { align: "right" });
    pdf.text("Expenses", pageWidth - 120, y, { align: "right" });
    pdf.text("Amount", pageWidth - 40, y, { align: "right" });
    pdf.setFont("helvetica", "normal");
    y += 12;

    invoiceBookings.forEach((booking) => {
      const expenses = (booking.expenses ?? []).reduce((sum, expense) => sum + expense.amount, 0);
      const freight = booking.pricing.calculatedFreight;
      const amount = freight + expenses;
      pdf.text(booking.bookingId, 40, y);
      pdf.text(formatCurrency(freight), pageWidth - 200, y, { align: "right" });
      pdf.text(formatCurrency(expenses), pageWidth - 120, y, { align: "right" });
      pdf.text(formatCurrency(amount), pageWidth - 40, y, { align: "right" });
      y += 14;
    });

    y += 14;
    pdf.text(`Subtotal: ${formatCurrency(invoice.subtotal)}`, 40, y);
    y += 14;
    pdf.text(`CGST (9%): ${formatCurrency(invoice.cgst)}`, 40, y);
    y += 14;
    pdf.text(`SGST (9%): ${formatCurrency(invoice.sgst)}`, 40, y);
    y += 16;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Grand Total: ${formatCurrency(invoice.total)}`, 40, y);
    pdf.save(`${invoice.invoiceId}.pdf`);
  }

  if (!canAccessFinanceWorkspace) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Finance" title="Finance" description="Restricted to finance-enabled roles." />
        <div className="rounded-2xl border border-dashed px-4 py-10 text-sm text-muted-foreground">
          Finance workspace is available only for finance-enabled roles.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Finance" title="Finance" description="Customer invoicing workspace for completed bookings." />

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <div className="rounded-[24px] border border-border/70 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Customers</p>
          <div className="mt-3 space-y-2">
            {financeCustomers.map((customer) => {
              const bookingCount = bookings.filter((booking) => booking.customerId === customer.id).length;
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId(customer.id);
                    setSelectedBookingIds([]);
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left ${selectedCustomerId === customer.id ? "border-primary/40 bg-sky-50" : "border-border/70 bg-white"}`}
                >
                  <span className="text-sm font-medium">{customer.name}</span>
                  <Badge variant={selectedCustomerId === customer.id ? "accent" : "outline"}>{bookingCount}</Badge>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <Tabs tabs={["Invoice Workspace", "Generated Invoices"]} active={activeTab} onChange={setActiveTab} />
          <div className="grid gap-3 md:grid-cols-3">
            <TenantSummaryCard label="Invoice Pending" value={String(invoicePendingBookings.length)} helper="Completed and not invoiced" />
            <TenantSummaryCard label="Invoiced" value={String(invoicedBookings.length)} helper="Already linked to finance invoice" />
            <TenantSummaryCard label="Customer" value={customerMap.get(selectedCustomerId)?.name ?? "-"} helper="Current invoicing scope" />
          </div>

          {activeTab === "Invoice Workspace" ? (
            <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-[24px] border border-border/70 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold">Invoice Pending</p>
                <div className="mt-3 max-h-[260px] overflow-y-auto">
                  <DataTable
                    title=""
                    description=""
                    headers={["Select", "Booking", "Freight", "Expenses", "Status"]}
                    rows={invoicePendingBookings.map((booking) => {
                      const expenses = (booking.expenses ?? []).reduce((sum, expense) => sum + expense.amount, 0);
                      return [
                        <input key={`${booking.id}-select`} type="checkbox" checked={selectedBookingIds.includes(booking.id)} onChange={() => toggleBookingSelection(booking.id)} />,
                        booking.bookingId,
                        formatCurrency(booking.pricing.calculatedFreight),
                        formatCurrency(expenses),
                        <BookingStatusBadge key={`${booking.id}-status`} status={booking.status} />,
                      ];
                    })}
                    emptyMessage="No invoice-pending bookings."
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold">Invoice Document Preview</p>
                <div className="mt-3 space-y-3">
                  {selectedBookings.length ? (
                    <>
                      <div className="max-h-[720px] overflow-y-auto rounded-[24px] border border-border/70 bg-slate-50 p-3">
                        <InvoiceDocumentCard
                          invoice={{
                            invoiceId: draftInvoiceId,
                            tenantId: tenant.id,
                            customerId: selectedCustomerId,
                            bookingIds: selectedBookings.map((booking) => booking.id),
                            subtotal,
                            cgst,
                            sgst,
                            total,
                            createdAt: new Date().toISOString(),
                          }}
                          bookings={selectedBookings}
                          customerMap={customerMap}
                          addressMap={buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat())}
                          previewMode
                        />
                      </div>
                      {access.can("FINANCE_WORKSPACE", "GENERATE_INVOICE") ? (
                        <Button onClick={generateInvoice} disabled={!selectedBookingIds.length}>Generate Invoice</Button>
                      ) : null}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                      Select bookings to preview the invoice document.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-[24px] border border-border/70 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold">Generated Invoices ({customerInvoices.length})</p>
                <div className="mt-3 max-h-[380px] overflow-y-auto">
                  <DataTable
                    title=""
                    description=""
                    headers={["Invoice Number", "Customer Name", "Total Amount", "Date", "Action"]}
                      rows={customerInvoices.map((invoice) => [
                        invoice.invoiceId,
                        customerMap.get(invoice.customerId)?.name ?? "-",
                        formatCurrency(invoice.total),
                        new Date(invoice.createdAt).toLocaleDateString(),
                        <div key={`${invoice.invoiceId}-actions`} className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedInvoiceId(invoice.invoiceId);
                              navigate(`/tenant/${tenant.id}/finance/invoice/${invoice.invoiceId}`);
                            }}
                          >
                            View Invoice
                          </Button>
                          {access.can("FINANCE_WORKSPACE", "DOWNLOAD") ? (
                            <Button size="sm" variant="ghost" onClick={() => downloadInvoicePdf(invoice.invoiceId)}>
                              Download
                            </Button>
                          ) : null}
                        </div>,
                      ])}
                    emptyMessage="No generated invoices."
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold">Invoice View</p>
                <div className="mt-3 space-y-3">
                  {selectedInvoice ? (
                    <>
                      <div className="rounded-2xl border border-border/70 bg-slate-50 p-3 text-sm">
                        <p className="font-semibold">{selectedInvoice.invoiceId}</p>
                        <p>Customer: {customerMap.get(selectedInvoice.customerId)?.name ?? "-"}</p>
                        <p>Created: {new Date(selectedInvoice.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="max-h-[540px] overflow-y-auto rounded-[24px] border border-border/70 bg-slate-50 p-3">
                        <InvoiceDocumentCard
                          invoice={selectedInvoice}
                          bookings={(selectedInvoice.bookingIds ?? [])
                            .map((bookingId) => bookings.find((booking) => booking.id === bookingId) ?? null)
                            .filter((booking): booking is BookingRecord => Boolean(booking))}
                          customerMap={customerMap}
                          addressMap={buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat())}
                          previewMode
                        />
                      </div>
                      <div className="flex gap-2">
                        {access.can("FINANCE_WORKSPACE", "VIEW_INVOICE") ? (
                          <Button onClick={() => navigate(`/tenant/${tenant.id}/finance/invoice/${selectedInvoice.invoiceId}`)}>View Invoice</Button>
                        ) : null}
                        {access.can("FINANCE_WORKSPACE", "DOWNLOAD") ? (
                          <Button variant="outline" onClick={() => downloadInvoicePdf(selectedInvoice.invoiceId)}>Download</Button>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                      No generated invoice selected.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FinanceInvoiceDocumentPage() {
  const { invoiceId } = useParams();
  const { tenant } = useTenantRouteContext();
  const { data: bookings } = useTenantBookings(tenant.id);
  const { data: invoices } = useTenantFinance(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );

  const invoice = invoices.find((item) => item.invoiceId === invoiceId) ?? null;
  const invoiceBookings = useMemo(
    () =>
      (invoice?.bookingIds ?? [])
        .map((bookingKey) => bookings.find((booking) => booking.id === bookingKey) ?? null)
        .filter((booking): booking is BookingRecord => Boolean(booking)),
    [bookings, invoice?.bookingIds],
  );

  if (!invoice) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Finance" title="Invoice not found" description="Selected invoice record is unavailable." />
        <div className="rounded-2xl border border-dashed px-4 py-10 text-sm text-muted-foreground">
          Invoice not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Finance"
        title={`Invoice ${invoice.invoiceId}`}
        description="Printable GST invoice document."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" />
              Print
            </Button>
            <Button variant="outline" onClick={() => {
              const pdf = new jsPDF({ unit: "pt", format: "a4" });
              pdf.setFontSize(14);
              pdf.text(`Invoice ${invoice.invoiceId}`, 40, 48);
              pdf.text(`Customer: ${customerMap.get(invoice.customerId)?.name ?? "-"}`, 40, 70);
              pdf.text(`Total: ${formatCurrency(invoice.total)}`, 40, 92);
              pdf.save(`${invoice.invoiceId}.pdf`);
            }}>Download</Button>
          </div>
        }
      />

      <InvoiceDocumentCard invoice={invoice} bookings={invoiceBookings} customerMap={customerMap} addressMap={addressMap} />
    </div>
  );
}

function InvoiceDocumentCard({
  invoice,
  bookings,
  customerMap,
  addressMap,
  previewMode = false,
}: {
  invoice: TenantInvoiceRecord;
  bookings: BookingRecord[];
  customerMap: ReturnType<typeof buildCustomerLookup>;
  addressMap: ReturnType<typeof buildAddressLookup>;
  previewMode?: boolean;
}) {
  const customer = customerMap.get(invoice.customerId) ?? null;
  const invoiceRows = bookings.map((booking, index) => buildInvoiceDocumentRow(booking, addressMap, index + 1));

  return (
    <div className={`mx-auto max-w-5xl rounded-[28px] border border-border/70 bg-white shadow-sm print:rounded-none print:border-none print:shadow-none ${previewMode ? "p-5" : "p-8 print:p-0"}`}>
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-3xl font-semibold tracking-[-0.02em] text-slate-900">EasyLane Transport</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              161, Basavanagar Main Rd, above Reliance Trends, Vignan Nagar, Doddanekkundi Road, Bengaluru, Karnataka, India - 560037
            </p>
            <p className="mt-1 text-sm text-slate-600">GSTIN: XXXXXXXXXXXXXX | PAN No. - XXXXXXXXX</p>
          </div>
          <div className="min-w-[240px] rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Invoice</p>
            <div className="mt-3 space-y-2">
              <InvoiceMetaRow label="Invoice Number" value={invoice.invoiceId} />
              <InvoiceMetaRow label="Bill Date" value={new Date(invoice.createdAt).toLocaleDateString()} />
              <InvoiceMetaRow label="Terms of Payment" value="30 Days" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-200 py-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bill To</p>
          <p className="mt-3 text-base font-semibold text-slate-900">{customer?.name ?? "Unknown customer"}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{customer?.billingAddress ?? "Address Including GSTN details"}</p>
          <p className="mt-2 text-sm text-slate-600">GSTIN: {customer?.gstin ?? customer?.gstNumber ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Dispatch Details</p>
          <div className="mt-3 space-y-2 text-sm">
            <InvoiceMetaRow label="Customer Code" value={customer?.code ?? "-"} />
            <InvoiceMetaRow label="Dispatch Document No." value="-" />
            <InvoiceMetaRow label="Terms of Delivery" value="Door Delivery" />
          </div>
        </div>
      </div>

      <div className="py-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-3 font-semibold text-slate-700">Sr. No</th>
                <th className="px-3 py-3 font-semibold text-slate-700">Bkg ID</th>
                <th className="px-3 py-3 font-semibold text-slate-700">Shipping Date</th>
                <th className="px-3 py-3 font-semibold text-slate-700">Delivery Date</th>
                <th className="px-3 py-3 font-semibold text-slate-700">Truck No</th>
                <th className="px-3 py-3 font-semibold text-slate-700">Place of Origin</th>
                <th className="px-3 py-3 font-semibold text-slate-700">Place of Destination</th>
                <th className="px-3 py-3 font-semibold text-slate-700">LR No.</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700">Qty</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700">Freight</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700">Other</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700">Freight Cost</th>
              </tr>
            </thead>
            <tbody>
              {invoiceRows.map((row) => (
                <tr key={row.bookingId} className="border-t border-slate-200">
                  <td className="px-3 py-3 text-slate-900">{row.serialNo}</td>
                  <td className="px-3 py-3 text-slate-900">{row.bookingId}</td>
                  <td className="px-3 py-3 text-slate-600">{row.shippingDate}</td>
                  <td className="px-3 py-3 text-slate-600">{row.deliveryDate}</td>
                  <td className="px-3 py-3 text-slate-900">{row.vehicleNumber}</td>
                  <td className="px-3 py-3 text-slate-600">{row.origin}</td>
                  <td className="px-3 py-3 text-slate-600">{row.destination}</td>
                  <td className="px-3 py-3 text-slate-900">{row.lrNumber}</td>
                  <td className="px-3 py-3 text-right text-slate-900">{row.quantity}</td>
                  <td className="px-3 py-3 text-right text-slate-900">{formatCurrency(row.freight)}</td>
                  <td className="px-3 py-3 text-right text-slate-900">{formatCurrency(row.expenses)}</td>
                  <td className="px-3 py-3 text-right font-medium text-slate-900">{formatCurrency(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-slate-900">In Words:</p>
          <p className="mt-2 text-slate-600">{formatAmountInWords(invoice.total)}</p>
          <div className="mt-4 space-y-1 text-slate-600">
            <p>Bank Details:</p>
            <p>Account Holder Name: EasyLane Transport</p>
            <p>Type of Account: Current</p>
          </div>
        </div>
        <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="space-y-2 text-sm">
            <InvoiceMetaRow label="Taxable Value" value={formatCurrency(invoice.subtotal)} />
            <InvoiceMetaRow label="CGST @9%" value={formatCurrency(invoice.cgst)} />
            <InvoiceMetaRow label="SGST @9%" value={formatCurrency(invoice.sgst)} />
            <div className="border-t border-slate-200 pt-2">
              <InvoiceMetaRow label="Total Invoice Value" value={formatCurrency(invoice.total)} strong />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600">
        <p className="font-semibold text-slate-900">DECLARATION</p>
        <p>1. No credit is available unless confirmed in writing by our Authorised Signatory.</p>
        <p>2. Interest @18% per annum will be charged on delayed payments past the due date.</p>
        <p>3. Any discrepancies in the invoice should be informed in writing within 7 days of submission.</p>
      </div>
    </div>
  );
}

function InvoiceMetaRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-600">{label}</span>
      <span className={strong ? "font-semibold text-slate-900" : "font-medium text-slate-900"}>{value}</span>
    </div>
  );
}

function buildInvoiceDocumentRow(
  booking: BookingRecord,
  addressMap: ReturnType<typeof buildAddressLookup>,
  serialNo: number,
) {
  const source = addressMap.get(booking.sourceAddressId);
  const destination = addressMap.get(booking.destinationAddressId);
  const expenses = (booking.expenses ?? []).reduce((sum, expense) => sum + expense.amount, 0);
  const freight = booking.pricing.calculatedFreight;
  const latestPodDate =
    booking.deliveries?.map((delivery) => delivery.pod?.podUploadedAt ?? delivery.pod?.capturedAt ?? null).filter(Boolean).at(-1) ??
    booking.updatedAt;

  return {
    serialNo,
    bookingId: booking.bookingId,
    shippingDate: formatDateValue(booking.pickupDate ?? booking.createdAt),
    deliveryDate: formatDateValue(latestPodDate),
    vehicleNumber: booking.assignment?.vehicleLabel ?? "-",
    origin: source?.city ?? source?.addressName ?? "Source",
    destination: destination?.city ?? destination?.addressName ?? "Destination",
    lrNumber: booking.assignment?.lrNumber ?? booking.shipmentDocuments?.lr?.number ?? "-",
    quantity: `${Number(booking.quantity ?? 0).toLocaleString()} ${booking.uom ?? ""}`.trim(),
    freight,
    expenses,
    amount: freight + expenses,
  };
}

function formatDateValue(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString();
}

function formatAmountInWords(amount: number) {
  const rounded = Math.round(amount);
  if (rounded === 0) {
    return "Rupees Zero Only";
  }

  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function belowThousand(num: number): string {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    const hundredPart = hundred ? `${units[hundred]} Hundred` : "";
    const restPart = rest < 20 ? units[rest] : `${tens[Math.floor(rest / 10)]}${rest % 10 ? ` ${units[rest % 10]}` : ""}`;
    return [hundredPart, restPart].filter(Boolean).join(" ").trim();
  }

  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const hundred = rounded % 1000;

  const parts = [
    crore ? `${belowThousand(crore)} Crore` : "",
    lakh ? `${belowThousand(lakh)} Lakh` : "",
    thousand ? `${belowThousand(thousand)} Thousand` : "",
    hundred ? belowThousand(hundred) : "",
  ].filter(Boolean);

  return `Rupees ${parts.join(" ")} Only`;
}

function SignalCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof RadioTower;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-border/80 bg-gradient-to-br from-white to-slate-50/90 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-primary/[0.08] p-2 text-primary">
          <Icon className="size-4" />
        </div>
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
