import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

export function DataTable({
  title,
  description,
  headers,
  rows,
  emptyMessage = "No records available.",
  onRowClick,
  pageSize,
}: {
  title: string;
  description: string;
  headers: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
  onRowClick?: (rowIndex: number) => void;
  /** When set, paginates rows client-side with this many rows per page. */
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const totalPages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages);
  const offset = pageSize ? (safePage - 1) * pageSize : 0;
  const visibleRows = pageSize ? rows.slice(offset, offset + pageSize) : rows;

  return (
    <Card className="glass-panel overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-gradient-to-r from-white/90 to-sky-50/70">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 text-left text-muted-foreground">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="border-b border-r border-border/70 bg-slate-50/95 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] last:border-r-0"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length ? (
              visibleRows.map((row, index) => (
                <tr
                  key={offset + index}
                  className={`transition-colors duration-150 hover:bg-blue-50 ${
                    index > 0 ? "border-t border-border" : ""
                  } ${index % 2 === 0 ? "bg-background/90" : "bg-slate-50/55"} ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={onRowClick ? () => onRowClick(offset + index) : undefined}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border-r border-border px-3 py-2.5 align-top last:border-r-0"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr className="border-t border-border/65">
                <td colSpan={headers.length} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
      {pageSize && rows.length > pageSize ? (
        <div className="flex items-center justify-between border-t border-border/60 bg-slate-50/60 px-4 py-3 text-sm text-muted-foreground">
          <span>
            Showing {offset + 1}-{Math.min(offset + pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 font-semibold text-foreground transition-colors hover:bg-slate-50 disabled:opacity-50"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="rounded-lg bg-white px-3 py-1.5 font-semibold text-foreground">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 font-semibold text-foreground transition-colors hover:bg-slate-50 disabled:opacity-50"
              disabled={safePage === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
