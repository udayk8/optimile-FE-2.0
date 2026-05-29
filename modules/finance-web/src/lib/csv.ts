/* ============================================================
   Client-side CSV export — no dependencies.
   exportCsv("file.csv", [{ key, label }], rows) → triggers a download.
   ============================================================ */

export interface CsvColumn {
  key?: string
  label: string
  value?: (row: any) => unknown
}

const escape = (val: unknown): string => {
  const s = val == null ? '' : String(val)
  // Quote if the value contains a comma, quote or newline; escape inner quotes.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCsv(filename: string, columns: CsvColumn[], rows: any[]): void {
  const header = columns.map((c) => escape(c.label)).join(',')
  const body = rows
    .map((row) =>
      columns.map((c) => escape(typeof c.value === 'function' ? c.value(row) : row[c.key as string])).join(','),
    )
    .join('\n')
  const csv = `${header}\n${body}`

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
