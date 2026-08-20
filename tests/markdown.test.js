import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMarkdownLines, toggleChecklistLine } from '../src/markdown.js'

test('parses headings, checklists, bullets, and code', () => {
  const tokens = parseMarkdownLines('# Plan\n- [ ] Ship\n- item\n```\nnpm test\n```')
  assert.deepEqual(
    tokens.map((token) => token.type),
    ['heading', 'checklist', 'bullet', 'code'],
  )
})

test('updates one checklist line', () => {
  assert.equal(toggleChecklistLine('- [ ] Ship\nKeep working', 0, true), '- [x] Ship\nKeep working')
})
