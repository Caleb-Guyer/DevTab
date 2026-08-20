export function parseMarkdownLines(content) {
  const tokens = []
  let inCodeBlock = false

  content.split('\n').forEach((line, lineIndex) => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      return
    }

    if (inCodeBlock) {
      tokens.push({ type: 'code', text: line, lineIndex })
      return
    }

    const heading = line.match(/^(#{1,3})\s+(.+)/)
    if (heading) {
      tokens.push({
        type: 'heading',
        level: heading[1].length,
        text: heading[2],
        lineIndex,
      })
      return
    }

    const checklist = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)/)
    if (checklist) {
      tokens.push({
        type: 'checklist',
        checked: checklist[1].toLowerCase() === 'x',
        text: checklist[2],
        lineIndex,
      })
      return
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)/)
    if (bullet) {
      tokens.push({ type: 'bullet', text: bullet[1], lineIndex })
      return
    }

    tokens.push({ type: line.trim() ? 'paragraph' : 'blank', text: line, lineIndex })
  })

  return tokens
}

export function toggleChecklistLine(content, lineIndex, checked) {
  const lines = content.split('\n')
  if (!lines[lineIndex]) return content
  lines[lineIndex] = lines[lineIndex].replace(
    /^(\s*[-*]\s+)\[[ xX]\]/,
    `$1[${checked ? 'x' : ' '}]`,
  )
  return lines.join('\n')
}
