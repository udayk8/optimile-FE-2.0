import React from 'react';

type InsightTone = 'positive' | 'watch' | 'critical' | 'info';

interface InsightItem {
  label: string;
  title: string;
  metric: string;
  tone: InsightTone;
  description: string;
  action: string;
}

interface AIInsightsPanelProps {
  title: string;
  summary: string;
  insights: InsightItem[];
  footer?: string;
}

const toneStyles: Record<InsightTone, string> = {
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  watch: 'border-amber-200 bg-amber-50 text-amber-700',
  critical: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
};

export function AIInsightsPanel({ title, summary, insights, footer }: AIInsightsPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">AI Insights</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{summary}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {insights.map((insight) => (
          <article key={insight.title} className={`rounded-xl border p-4 ${toneStyles[insight.tone]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">{insight.label}</p>
                <h3 className="mt-2 text-base font-semibold text-slate-900">{insight.title}</h3>
              </div>
              <span className="text-lg font-bold text-slate-900">{insight.metric}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{insight.description}</p>
            <p className="mt-3 text-sm font-medium text-slate-700">{insight.action}</p>
          </article>
        ))}
      </div>

      {footer ? <p className="mt-5 text-xs text-slate-400">{footer}</p> : null}
    </section>
  );
}
