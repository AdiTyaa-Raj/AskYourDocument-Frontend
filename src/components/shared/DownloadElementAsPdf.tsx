export async function downloadElementAsPdf(element: HTMLElement, fileName = 'document') {
  if (!element) {
    throw new Error('Element not found')
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for this site.')
  }

  const clonedElement = element.cloneNode(true) as HTMLElement

  // Collect all same-origin styles
  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n')
      } catch {
        return ''
      }
    })
    .join('\n')

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${fileName}</title>
        <style>
          ${styles}

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 24px;
            background: white;
          }

          @media print {
            body {
              padding: 0;
            }

            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        ${clonedElement.outerHTML}
        <script>
          window.onload = () => {
            window.print()
            setTimeout(() => window.close(), 500)
          }
        </script>
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
