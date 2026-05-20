import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

export function DataTable({
  title,
  description,
  headers,
  rows,
  emptyMessage = "No records available.",
  onRowClick,
}: {
  title: string;
  description: string;
  headers: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
  onRowClick?: (rowIndex: number) => void;
}) {
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
            {rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={index}
                  className={`transition-colors duration-150 hover:bg-blue-50 ${
                    index > 0 ? "border-t border-border" : ""
                  } ${index % 2 === 0 ? "bg-background/90" : "bg-slate-50/55"} ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={onRowClick ? () => onRowClick(index) : undefined}
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
    </Card>
  );
}
