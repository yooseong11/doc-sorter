import { MAX_TEXT_CHARS } from '../../../shared/classifyContract.js'

// hwpx는 zip이다. 본문은 Contents/section0.xml부터 번호 순서로 들어 있고,
// 이미지는 BinData/·Preview/에 따로 있어 본문 XML만 읽으면 저절로 빠진다. (ADR 0007)
const PARAGRAPH_NS = 'http://www.hancom.co.kr/hwpml/2011/paragraph'

export async function extractHwpxText(file) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const sections = Object.keys(zip.files)
    .filter((path) => /^contents\/section\d+\.xml$/i.test(path))
    .sort((a, b) => sectionNumber(a) - sectionNumber(b))

  let text = ''
  for (const path of sections) {
    // pdf.js와 같은 방식으로 상한만큼 채우면 멈춘다.
    if (text.length >= MAX_TEXT_CHARS) break
    text += sectionText(await zip.file(path).async('string')) + '\n'
  }
  return text
}

function sectionNumber(path) {
  return Number(path.match(/(\d+)\.xml$/i)[1])
}

// 한 문단이 <hp:t> 여러 조각으로 쪼개져 있다. 같은 문단이면 붙이고, 문단이 바뀌면 줄을 바꾼다.
// 표 안의 문단도 <hp:p>라서 가장 가까운 조상 문단으로 묶으면 중복 없이 순서대로 나온다.
function sectionText(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const lines = []
  let current
  let line = ''
  for (const node of Array.from(doc.getElementsByTagNameNS(PARAGRAPH_NS, 't'))) {
    const paragraph = paragraphOf(node)
    if (paragraph !== current) {
      if (line) lines.push(line)
      current = paragraph
      line = ''
    }
    line += node.textContent
  }
  if (line) lines.push(line)
  return lines.join('\n')
}

function paragraphOf(node) {
  for (let element = node.parentElement; element; element = element.parentElement) {
    if (element.localName === 'p' && element.namespaceURI === PARAGRAPH_NS) return element
  }
  return null
}
