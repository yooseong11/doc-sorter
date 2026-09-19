export async function extractPdfText(file) {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerURL } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerURL
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false })
  task.onPassword = () => task.destroy()
  try {
    const pdf = await task.promise
    let text = ''
    for (let number = 1; number <= pdf.numPages && text.length < 6000; number++) {
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      text += content.items.map((item) => item.str || '').join(' ') + '\n'
      page.cleanup()
    }
    return text
  } finally {
    await task.destroy()
  }
}
