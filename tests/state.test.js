import test from 'node:test'
import assert from 'node:assert/strict'
import { CARD_IDS, createDefaultData } from '../src/config.js'
import { validateAppData, validateSettings } from '../src/state.js'

test('settings validation restores missing card order entries', () => {
  const settings = validateSettings({ cardOrder: ['notes'], visibleCards: ['notes', 'bad'] })
  assert.deepEqual(settings.visibleCards, ['notes'])
  assert.deepEqual(new Set(settings.cardOrder), new Set(CARD_IDS))
})

test('app validation removes unsafe and duplicate data', () => {
  const data = validateAppData({
    links: [
      { id: 'safe', label: 'Safe', url: 'https://example.com' },
      { id: 'bad', label: 'Bad', url: 'javascript:alert(1)' },
    ],
    notes: [],
    favoriteRepositories: ['DevTab', 'DevTab', 42],
  })
  assert.equal(data.links.length, 1)
  assert.equal(data.notes.length, 1)
  assert.deepEqual(data.favoriteRepositories, ['DevTab'])
})

test('default data starts with a usable pinned note', () => {
  const data = createDefaultData('hello')
  assert.equal(data.notes[0].content, 'hello')
  assert.equal(data.notes[0].pinned, true)
})
