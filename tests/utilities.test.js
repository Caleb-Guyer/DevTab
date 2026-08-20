import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSearchDestination,
  calculateExpression,
  normalizeLinkUrl,
  parseCommandInput,
  scoreMatch,
} from '../src/utilities.js'

test('normalizes safe links and rejects unsafe protocols', () => {
  assert.equal(normalizeLinkUrl('example.com'), 'https://example.com/')
  assert.throws(() => normalizeLinkUrl('javascript:alert(1)'), /http or https/)
})

test('builds search destinations and opens recognizable URLs directly', () => {
  assert.equal(buildSearchDestination('vite docs', 'github'), 'https://github.com/search?q=vite%20docs')
  assert.equal(buildSearchDestination('example.com', 'google'), 'https://example.com/')
})

test('parses commands and calculates arithmetic without eval', () => {
  assert.deepEqual(parseCommandInput('> calc (12 + 4) * 3'), {
    name: 'calc',
    args: '(12 + 4) * 3',
  })
  assert.equal(calculateExpression('(12 + 4) * 3'), 48)
  assert.throws(() => calculateExpression('1 / 0'), /zero/)
})

test('scores direct matches above loose matches', () => {
  assert.ok(scoreMatch('git', 'GitHub') > scoreMatch('git', 'Open GitHub'))
})
