import React from "react";
import { Card, SectionTitle, LedgerStatementTable, formatLedgerBalance } from "@finance/components/primitives";
import { usePayables } from "@finance/lib/payablesStore";

export default function Ledgers() {
  const { apLedger } = usePayables();
  const outstanding = apLedger.length ? apLedger[apLedger.length - 1].bal : 0;
  return (
    <div>
      <SectionTitle sub="Append-only running balance. Every financial event adds a row — never edited, fully auditable.">Vendor Ledger · Accounts Payable</SectionTitle>
      <Card className="overflow-hidden">
        <LedgerStatementTable rows={apLedger} kind="AP" />
        <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-right text-sm">
          <span className="text-slate-500">Outstanding payable: </span>
          <span className="font-mono font-bold text-slate-900">{formatLedgerBalance(outstanding, "AP")}</span>
        </div>
      </Card>
    </div>
  );
}
