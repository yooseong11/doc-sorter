export async function extractDocxText(file) {
  const { default: mammoth } = await import('mammoth/mammoth.browser.js')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}
