import React from "react";

/* ============================================================
   Proof of Delivery sheet — mirrors InvoiceDocument's inline-style
   approach so html2canvas captures it cleanly for PDF download.
   In Vendor Match this proves a vendor's shipment was delivered.
   ============================================================ */

const GREEN = "#059669";

const Meta = ({ k, v }: any) => (
  <tr>
    <td style={{ padding: "4px 10px", color: "#334155", fontWeight: 600, borderBottom: "1px solid #e2e8f0", width: "45%" }}>{k}</td>
    <td style={{ padding: "4px 10px", color: "#0f172a", borderBottom: "1px solid #e2e8f0" }}>{v ?? "–"}</td>
  </tr>
);

const PodDocument = React.forwardRef<HTMLDivElement, any>(function PodDocument({ invoice: inv, seller, billTo }, ref) {
  return (
    <div ref={ref} style={{ width: 800, background: "#fff", color: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", fontSize: 11, border: "2px solid " + GREEN }}>
      {/* Header */}
      <div style={{ display: "flex" }}>
        <div style={{ width: "55%", padding: "12px 14px", borderRight: "2px solid " + GREEN }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>{seller.name}</div>
          <div style={{ fontSize: 9.5, color: "#475569", marginTop: 4 }}>{seller.address}</div>
          <div style={{ fontSize: 9.5, color: "#475569", marginTop: 4, fontWeight: 600 }}>GST No. {seller.gstin} | PAN No. {seller.pan}</div>
        </div>
        <div style={{ width: "45%" }}>
          <div style={{ background: GREEN, color: "#fff", textAlign: "center", fontWeight: 700, letterSpacing: 1, padding: "4px 0", fontSize: 12 }}>PROOF OF DELIVERY</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
            <tbody>
              <Meta k="LR / Consignment No.:" v={inv.lrNo} />
              <Meta k="Booking ID:" v={inv.bookingId} />
              <Meta k="Truck No.:" v={inv.truckNo} />
              <Meta k="Shipping Date:" v={inv.shippingDate} />
              <Meta k="Delivery Date:" v={inv.deliveryDate} />
            </tbody>
          </table>
        </div>
      </div>

      {/* Route + consignee */}
      <div style={{ display: "flex", borderTop: "2px solid " + GREEN }}>
        <div style={{ width: "55%", padding: "10px 14px", borderRight: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>SHIPMENT</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>{inv.origin} → {inv.destination}</div>
          <div style={{ fontSize: 9.5, color: "#475569", marginTop: 4 }}>Quantity delivered: <b>{inv.qty}</b></div>
        </div>
        <div style={{ width: "45%", padding: "10px 14px" }}>
          <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>DELIVERED TO (CONSIGNEE)</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{billTo.name}</div>
          <div style={{ fontSize: 9.5, color: "#475569", marginTop: 3 }}>{billTo.address}</div>
        </div>
      </div>

      {/* Delivery confirmation */}
      <div style={{ display: "flex", borderTop: "2px solid " + GREEN, minHeight: 110 }}>
        <div style={{ width: "55%", padding: "12px 14px", borderRight: "1px solid #e2e8f0" }}>
          <div style={{ display: "inline-block", border: "2px solid " + GREEN, color: GREEN, fontWeight: 700, letterSpacing: 1, padding: "6px 14px", borderRadius: 6, fontSize: 12 }}>
            ✓ DELIVERED &amp; SIGNED
          </div>
          <div style={{ fontSize: 9.5, color: "#475569", marginTop: 10 }}>e-POD captured via driver app and verified by the Ops desk. Consignee acknowledged receipt of goods in good condition at destination.</div>
        </div>
        <div style={{ width: "45%", padding: "12px 14px", textAlign: "right", fontSize: 9.5 }}>
          <div style={{ color: "#64748b" }}>Received in good order for</div>
          <div style={{ fontWeight: 700 }}>{billTo.name}</div>
          <div style={{ marginTop: 40, color: "#64748b" }}>(Consignee Signature &amp; Stamp)</div>
        </div>
      </div>

      <div style={{ borderTop: "2px solid " + GREEN, textAlign: "center", fontSize: 8, color: GREEN, padding: "6px 0" }}>
        This is a system-generated Proof of Delivery.
      </div>
    </div>
  );
});

export default PodDocument;
