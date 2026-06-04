import React from "react";
import { Card, SectionTitle, LedgerStatementTable, formatLedgerBalance } from "@finance/components/primitives";
import { CLIENT_LEDGER } from "@finance/data/mock";

export default function Ledgers() {
  const rows = CLIENT_LEDGER.filter((r) => r.client === "Britannia Industries");
  const outstanding = rows.length ? rows[rows.length - 1].bal : 0;
  return (
    <div>
      <SectionTitle sub="Append-only running balance. Every financial event adds a row — never edited, fully auditable.">Client Ledger · Britannia Industries</SectionTitle>
      <Card className="overflow-hidden">
        <LedgerStatementTable rows={rows} kind="AR" />
        <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-right text-sm">
          <span className="text-slate-500">Outstanding balance: </span>
          <span className="font-mono font-bold text-slate-900">{formatLedgerBalance(outstanding, "AR")}</span>
        </div>
      </Card>
    </div>
  );
}
