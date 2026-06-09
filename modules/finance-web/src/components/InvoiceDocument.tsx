import React from "react";
import { fmtINR } from "@finance/lib/format";

/* ============================================================
   Optimile freight-invoice template (replicates INV-2024000.pdf).
   In Vendor Match the parties are Vendor → Optimile.
   Uses inline styles / safe colours so html2canvas captures cleanly.
   ============================================================ */

const BLUE = "#2f4fd6";
const amt = (n: any) => (n ? fmtINR(n).replace("₹", "") : "–");

const Meta = ({ k, v }: any) => (
  <tr>
    <td style={{ padding: "3px 8px", color: "#334155", fontWeight: 600, borderBottom: "1px solid #e2e8f0", width: "45%" }}>{k}</td>
    <td style={{ padding: "3px 8px", color: "#0f172a", borderBottom: "1px solid #e2e8f0" }}>{v ?? "–"}</td>
  </tr>
);

const TH = ({ children, w }: any) => (
  <th style={{ background: BLUE, color: "#fff", fontWeight: 600, padding: "5px 4px", border: "1px solid #1e3aa8", fontSize: 9, textAlign: "center", width: w }}>{children}</th>
);
const TDc = ({ children, alignRight }: any) => (
  <td style={{ padding: "6px 4px", border: "1px solid #e2e8f0", fontSize: 9.5, textAlign: alignRight ? "right" : "center", color: "#0f172a" }}>{children}</td>
);

const InvoiceDocument = React.forwardRef<HTMLDivElement, any>(function InvoiceDocument({ invoice: inv, seller, billTo }, ref) {
  const li = inv.lineItems;
  return (
    <div ref={ref} style={{ width: 800, background: "#fff", color: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", fontSize: 11, border: "2px solid " + BLUE }}>
      {/* Header: seller letterhead + INVOICE meta */}
      <div style={{ display: "flex" }}>
        <div style={{ width: "50%", padding: "12px 14px", borderRight: "2px solid " + BLUE }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>{seller.name}</div>
          <div style={{ fontSize: 9.5, color: "#475569", marginTop: 4 }}>{seller.address}</div>
          <div style={{ fontSize: 9.5, color: "#475569", marginTop: 4, fontWeight: 600 }}>GST No. {seller.gstin} | PAN No. {seller.pan}</div>
        </div>
        <div style={{ width: "50%" }}>
          <div style={{ background: BLUE, color: "#fff", textAlign: "center", fontWeight: 700, letterSpacing: 1, padding: "4px 0", fontSize: 12 }}>INVOICE</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
            <tbody>
              <Meta k="Invoice No.:" v={inv.invoiceNo} />
              <Meta k="Bill Date:" v={inv.billDate} />
              <Meta k="Delivery Note:" v="–" />
              <Meta k="Terms Of Payment:" v={inv.terms} />
              <Meta k="Customer Code:" v={billTo.customerCode} />
              <Meta k="Buyer's Order No.:" v={inv.bookingId} />
              <Meta k="Due Date:" v={inv.dueDate} />
              <Meta k="Dispatch Through:" v={inv.truckNo} />
              <Meta k="Destination:" v={inv.destination} />
              <Meta k="Origin:" v={inv.origin} />
              <Meta k="Terms of Delivery:" v="Door Delivery" />
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill to */}
      <div style={{ display: "flex", borderTop: "2px solid " + BLUE }}>
        <div style={{ width: "50%", padding: "10px 14px", borderRight: "2px solid " + BLUE }}>
          <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>BILL TO :</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{billTo.name}</div>
          <div style={{ fontSize: 9.5, color: "#475569", marginTop: 3 }}>{billTo.address}</div>
        </div>
        <div style={{ width: "50%", padding: "10px 14px" }}>
          <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600, textAlign: "center" }}>CLIENT DETAILS</div>
          <div style={{ fontSize: 9.5, color: "#475569", marginTop: 3, textAlign: "center" }}>GSTIN: {billTo.gstin}</div>
        </div>
      </div>

      {/* Line items */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "2px solid " + BLUE }}>
        <thead>
          <tr>
            <TH w="4%">Sr No</TH><TH w="7%">Bkg ID</TH><TH w="8%">Shipping Date</TH><TH w="8%">Delivery Date</TH>
            <TH w="9%">Truck No</TH><TH w="9%">Origin</TH><TH w="9%">Destination</TH><TH w="6%">LR No</TH><TH w="4%">Qty</TH>
            <TH w="8%">Freight</TH><TH w="6%">Advance</TH><TH w="8%">Detention</TH><TH w="9%">Loading & Unloading</TH><TH w="6%">Other</TH><TH w="9%">Freight Cost</TH>
          </tr>
        </thead>
        <tbody>
          <tr>
            <TDc>1</TDc><TDc>{inv.bookingId}</TDc><TDc>{inv.shippingDate}</TDc><TDc>{inv.deliveryDate}</TDc>
            <TDc>{inv.truckNo}</TDc><TDc>{inv.origin}</TDc><TDc>{inv.destination}</TDc><TDc>{inv.lrNo}</TDc><TDc>{inv.qty}</TDc>
            <TDc alignRight>{amt(li.freight)}</TDc><TDc alignRight>{amt(li.advance)}</TDc><TDc alignRight>{amt(li.detention)}</TDc>
            <TDc alignRight>{amt(li.loading)}</TDc><TDc alignRight>{amt(li.other)}</TDc><TDc alignRight>{amt(li.freightCost)}</TDc>
          </tr>
          {/* spacer rows for template feel */}
          {[0, 1].map((i) => (
            <tr key={i}>{Array.from({ length: 15 }).map((_, j) => <TDc key={j}>&nbsp;</TDc>)}</tr>
          ))}
        </tbody>
      </table>

      {/* Words + totals */}
      <div style={{ display: "flex", borderTop: "2px solid " + BLUE }}>
        <div style={{ width: "55%", padding: "10px 14px", borderRight: "1px solid #e2e8f0" }}>
          <span style={{ fontWeight: 700 }}>In Words: </span>
          <span style={{ color: "#334155" }}>{inv.amountInWords}</span>
        </div>
        <div style={{ width: "45%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <tbody>
              <tr><td style={{ padding: "4px 10px", color: "#334155" }}>Taxable Value</td><td style={{ padding: "4px 10px", textAlign: "right", fontFamily: "monospace" }}>{amt(inv.taxableValue)}</td></tr>
              {inv.cgst || inv.sgst ? (
                <>
                  <tr><td style={{ padding: "4px 10px", color: "#334155" }}>CGST @ {inv.cgstPct ?? 9}%</td><td style={{ padding: "4px 10px", textAlign: "right", fontFamily: "monospace" }}>{amt(inv.cgst)}</td></tr>
                  <tr><td style={{ padding: "4px 10px", color: "#334155" }}>SGST @ {inv.sgstPct ?? 9}%</td><td style={{ padding: "4px 10px", textAlign: "right", fontFamily: "monospace" }}>{amt(inv.sgst)}</td></tr>
                </>
              ) : (
                <tr><td style={{ padding: "4px 10px", color: "#334155" }}>IGST @ {inv.igstPct}%</td><td style={{ padding: "4px 10px", textAlign: "right", fontFamily: "monospace" }}>{amt(inv.igst)}</td></tr>
              )}
              <tr style={{ background: "#eef2ff" }}><td style={{ padding: "6px 10px", fontWeight: 700 }}>Total Invoice Value</td><td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, fontFamily: "monospace" }}>{amt(inv.total)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bank + signatory */}
      <div style={{ display: "flex", borderTop: "2px solid " + BLUE }}>
        <div style={{ width: "55%", padding: "10px 14px", borderRight: "1px solid #e2e8f0", fontSize: 9.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Bank Details:</div>
          {[["Account Holder Name", seller.bank.holder], ["Account Number", seller.bank.acc], ["Bank Branch", seller.bank.branch], ["IFSC", seller.bank.ifsc], ["Type of Account", seller.bank.type], ["Make all Cheques payable to", seller.bank.holder]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", margin: "2px 0" }}>
              <span style={{ width: "55%", color: "#64748b" }}>{k}:</span><span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ width: "45%", padding: "10px 14px", textAlign: "right", fontSize: 9.5 }}>
          <div>For <span style={{ fontWeight: 700 }}>{seller.name}</span></div>
          <div style={{ marginTop: 42, color: "#64748b" }}>(Authorised Signatory)</div>
        </div>
      </div>

      {/* Declaration */}
      <div style={{ borderTop: "2px solid " + BLUE }}>
        <div style={{ background: BLUE, color: "#fff", textAlign: "center", fontWeight: 700, letterSpacing: 1, padding: "3px 0", fontSize: 10 }}>DECLARATION</div>
        <ol style={{ margin: 0, padding: "8px 14px 8px 28px", fontSize: 8.5, color: "#475569" }}>
          <li>No credit is available unless confirmed in writing by our Authorised Signatory.</li>
          <li>Interest @ 18% per annum will be charged on delayed payments past the due date.</li>
          <li>Any discrepancies in the invoice should be informed in writing within 7 days of submission, otherwise the invoice will be considered as accepted.</li>
        </ol>
        <div style={{ textAlign: "center", fontSize: 8, color: BLUE, paddingBottom: 8 }}>This is a Computer Generated Invoice</div>
      </div>
    </div>
  );
});

export default InvoiceDocument;
