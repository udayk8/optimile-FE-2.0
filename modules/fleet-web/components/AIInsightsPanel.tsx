import React from 'react';

export type InsightTone = 'positive' | 'watch' | 'critical' | 'info';

export interface AIInsightItem {
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
  insights: AIInsightItem[];
  footer?: string;
}

const toneClasses: Record<InsightTone, { badge: string; card: string; metric: string }> = {
  positive: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    card: 'border-emerald-100 bg-emerald-50/60',
    metric: 'text-emerald-700',
  },
  watch: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    card: 'border-amber-100 bg-amber-50/60',
    metric: 'text-amber-700',
  },
  critical: {
    badge: 'border-red-200 bg-red-50 text-red-700',
    card: 'border-red-100 bg-red-50/70',
    metric: 'text-red-700',
  },
  info: {
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    card: 'border-blue-100 bg-blue-50/60',
    metric: 'text-blue-700',
  },
};

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  title,
  summary,
  insights,
  footer,
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-lg">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
            AI cockpit
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">{summary}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
          <span className="text-slate-400">Signals tracked:</span> {insights.length}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {insights.map((insight) => {
          const tone = toneClasses[insight.tone];
          return (
            <article
              key={`${insight.label}-${insight.title}`}
              className={`rounded-2xl border p-5 shadow-sm backdrop-blur ${tone.card}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {insight.label}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{insight.title}</h3>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone.badge}`}>
                  {insight.tone}
                </span>
              </div>

              <div className={`mt-5 text-3xl font-bold tracking-tight ${tone.metric}`}>{insight.metric}</div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{insight.description}</p>

              <div className="mt-4 rounded-xl border border-white/60 bg-white/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Recommended action
                </p>
                <p className="mt-2 text-sm text-slate-700">{insight.action}</p>
              </div>
            </article>
          );
        })}
      </div>

      {footer && (
        <p className="mt-5 text-xs leading-5 text-slate-400">{footer}</p>
      )}
    </section>
  );
};
