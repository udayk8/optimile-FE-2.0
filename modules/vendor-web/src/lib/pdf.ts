/* ============================================================
   Client-side PDF export — captures a DOM element to an A4 PDF.
   jspdf + html2canvas are dynamically imported so they stay out
   of the main bundle until a download is actually requested.
   (Same helper as finance-web's lib/pdf.)
   ============================================================ */

export async function downloadElementAsPdf(
  el: HTMLElement | null | undefined,
  filename = 'document.pdf',
): Promise<void> {
  if (!el) return
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const pxPerMm = canvas.width / pageW
  const pageHpx = pageH * pxPerMm

  // Single page — add as-is.
  if (canvas.height <= pageHpx + 1) {
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, canvas.height / pxPerMm)
    pdf.save(filename)
    return
  }

  // Multi-page: cut between marked section boundaries so no block (a booking
  // row, totals, bank details…) is sliced across the fold. Boundaries come from
  // elements tagged data-pdf-break; without them we fall back to a hard cut.
  const elRect = el.getBoundingClientRect()
  const domToPx = canvas.height / elRect.height
  const breakOffsets = Array.from(el.querySelectorAll<HTMLElement>('[data-pdf-break]'))
    .map((node) => (node.getBoundingClientRect().top - elRect.top) * domToPx)
    .filter((y) => y > 0 && y < canvas.height)
    .sort((a, b) => a - b)

  let cursor = 0
  let first = true
  while (cursor < canvas.height - 1) {
    const hardLimit = cursor + pageHpx
    // Largest break that fits on this page (and makes forward progress).
    const candidate = breakOffsets.filter((y) => y > cursor + 1 && y <= hardLimit).pop()
    const cut = candidate ?? Math.min(hardLimit, canvas.height)
    const sliceH = Math.max(1, Math.round(cut - cursor))

    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = sliceH
    const ctx = slice.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, slice.width, slice.height)
      ctx.drawImage(canvas, 0, cursor, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
    }
    if (!first) pdf.addPage()
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, pageW, sliceH / pxPerMm)
    first = false
    cursor = cut
  }

  pdf.save(filename)
}

/** "1,00,182" → "One Lakh One Hundred Eighty Two" (Indian numbering). */
export function amountInWords(amount: number): string {
  const n = Math.round(Math.abs(amount))
  if (n === 0) return 'Zero'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const twoDigits = (x: number): string => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? ' ' + ones[x % 10] : ''}`)
  const threeDigits = (x: number): string => {
    const h = Math.floor(x / 100)
    const rest = x % 100
    return [h ? `${ones[h]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ')
  }
  const parts: string[] = []
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const rest = n % 1000
  if (crore) parts.push(`${twoDigits(crore)} Crore`)
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (rest) parts.push(threeDigits(rest))
  return parts.join(' ')
}
