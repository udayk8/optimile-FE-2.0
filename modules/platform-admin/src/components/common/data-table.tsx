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
    <Card className="overflow-hidden rounded-xl border border-gray-200">
      <CardHeader className="border-b border-gray-200 bg-white">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="border-b border-gray-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500"
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
                  className={`${index > 0 ? "border-t border-gray-200" : ""} ${onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
                  onClick={onRowClick ? () => onRowClick(index) : undefined}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-4 align-top text-sm text-gray-700"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr className="border-t border-gray-200">
                <td colSpan={headers.length} className="px-4 py-10 text-center text-sm text-gray-500">
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
