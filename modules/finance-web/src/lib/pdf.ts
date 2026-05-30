/* ============================================================
   Client-side PDF export — captures a DOM element to an A4 PDF.
   jspdf + html2canvas are dynamically imported so they stay out
   of the main bundle until a download is actually requested.
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
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
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
