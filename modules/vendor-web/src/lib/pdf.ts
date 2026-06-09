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

  const img = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()

  // Fit the capture to A4 width, paginating vertically if it overflows.
  const imgW = pageW
  const imgH = (canvas.height * imgW) / canvas.width

  let remaining = imgH
  let position = 0
  pdf.addImage(img, 'PNG', 0, position, imgW, imgH)
  remaining -= pageH
  while (remaining > 0) {
    position -= pageH
    pdf.addPage()
    pdf.addImage(img, 'PNG', 0, position, imgW, imgH)
    remaining -= pageH
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
