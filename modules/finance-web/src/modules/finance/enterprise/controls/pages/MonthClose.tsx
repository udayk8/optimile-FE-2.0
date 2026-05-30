import React, { useState } from "react";
import { Check, Lock, FileText } from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { CLOSE_CHECKLIST } from "@finance/data/mock";

export default function MonthClose({ toast }: any) {
  const [list, setList] = useState(CLOSE_CHECKLIST);
  const [locked, setLocked] = useState(false);
  const allDone = list.every((t) => t.done);

  const toggle = (i: any) => setList((xs) => xs.map((t, j) => (j === i ? { ...t, done: !t.done } : t)));
  const lock = () => { setLocked(true); toast("April 2026 closed & locked — monthly P&L generated"); };

  return (
    <div>
      <SectionTitle sub="A system-driven checklist before a month can close. Once locked, no new entries post to that period without override.">Month-End Close · April 2026</SectionTitle>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-slate-800">Closing checklist</h3>
          <div className="space-y-2">
            {list.map((t, i) => (
              <button key={i} disabled={locked} onClick={() => toggle(i)}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${t.done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"} disabled:cursor-not-allowed`}>
                <span className={`grid h-5 w-5 place-items-center rounded ${t.done ? "bg-emerald-500 text-white" : "border border-slate-300"}`}>{t.done && <Check size={13} />}</span>
                <span className={t.done ? "text-slate-700" : "text-slate-600"}>{t.task}</span>
              </button>
            ))}
          </div>
          <div className="mt-5">
            {locked ? (
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"><Lock size={15} />Period locked</div>
            ) : (
              <button onClick={lock} disabled={!allDone}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40">
                <Lock size={15} />{allDone ? "Close & lock month" : "Complete all tasks to close"}
              </button>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><FileText size={16} className="text-slate-400" />Monthly P&amp;L</div>
          {locked ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Revenue</span><Money value={3350000} className="font-medium text-slate-800" /></div>
              <div className="flex justify-between"><span className="text-slate-500">Vendor cost</span><Money value={-2480000} className="text-slate-500" /></div>
              <div className="flex justify-between"><span className="text-slate-500">Fleet & ops cost</span><Money value={-410000} className="text-slate-500" /></div>
              <div className="my-2 border-t border-slate-200" />
              <div className="flex justify-between"><span className="font-semibold text-slate-800">Net profit</span><Money value={460000} className="font-bold text-emerald-600" /></div>
              <div className="mt-2"><Pill tone="green">Broken down by client · lane · vehicle</Pill></div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">P&amp;L auto-generates once the month is closed.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
