import test from 'node:test'
import assert from 'node:assert/strict'
import { APP_VERSION, CARD_IDS, createDefaultData } from '../src/config.js'
import { getActiveWorkspace, validateAppData, validateSettings } from '../src/state.js'

test('global settings validation rejects unsupported values', () => {
  const settings = validateSettings({
    theme: 'neon',
    searchEngine: 'ask-jeeves',
    backgroundIntensity: 'extreme',
  })
  assert.equal(settings.theme, 'system')
  assert.equal(settings.searchEngine, 'google')
  assert.equal(settings.backgroundIntensity, 'balanced')
})

test('workspace validation removes unsafe data and restores the complete layout', () => {
  const data = validateAppData({
    version: APP_VERSION,
    settings: {},
    workspaces: [
      {
        id: 'workspace-safe',
        name: 'Safe',
        command: 'safe',
        links: [
          { id: 'safe', label: 'Safe', url: 'https://example.com' },
          { id: 'bad', label: 'Bad', url: 'javascript:alert(1)' },
        ],
        notes: [],
        favoriteRepositories: ['DevTab', 'DevTab', 42],
        visibleCards: ['notes', 'bad'],
        cardOrder: ['notes'],
      },
    ],
    activeWorkspaceId: 'workspace-safe',
  })
  const workspace = getActiveWorkspace(data)
  assert.equal(workspace.links.length, 1)
  assert.equal(workspace.notes.length, 1)
  assert.deepEqual(workspace.favoriteRepositories, ['DevTab'])
  assert.deepEqual(workspace.visibleCards, ['notes'])
  assert.deepEqual(new Set(workspace.cardOrder), new Set(CARD_IDS))
})

test('v2 data migrates into the first project workspace', () => {
  const data = validateAppData({
    version: 2,
    settings: {
      accent: 'amber',
      visibleCards: ['links', 'notes'],
      cardOrder: ['notes', 'links', 'github', 'weather'],
    },
    links: [{ id: 'docs', label: 'Docs', url: 'https://vite.dev/' }],
    notes: [
      {
        id: 'note-old',
        title: 'Migrated',
        content: 'kept',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        pinned: true,
      },
    ],
    activeNoteId: 'note-old',
    favoriteRepositories: ['DevTab'],
  })
  const workspace = getActiveWorkspace(data)
  assert.equal(data.version, 3)
  assert.equal(workspace.accent, 'amber')
  assert.equal(workspace.notes[0].content, 'kept')
  assert.equal(workspace.links[0].label, 'Docs')
  assert.ok(['project', 'tasks', 'focus', 'session'].every((card) => workspace.visibleCards.includes(card)))
  assert.deepEqual(workspace.cardOrder.slice(0, 4), ['project', 'focus', 'tasks', 'session'])
})

test('default data starts with a usable workspace and pinned note', () => {
  const data = createDefaultData('hello')
  const workspace = getActiveWorkspace(data)
  assert.equal(data.version, 3)
  assert.equal(workspace.repository, 'Caleb-Guyer/DevTab')
  assert.equal(workspace.notes[0].content, 'hello')
  assert.equal(workspace.notes[0].pinned, true)
  assert.deepEqual(workspace.cardOrder, CARD_IDS)
})

test('workspace project data normalizes repositories, tasks, focus, and saved tabs', () => {
  const data = validateAppData({
    version: 3,
    settings: {},
    workspaces: [
      {
        id: 'workspace-project',
        name: 'Project',
        repository: 'https://github.com/Caleb-Guyer/DevTab.git',
        tasks: [
          { id: 'task-1', title: 'Ship it', completed: false },
          { id: 'task-1', title: 'Duplicate', completed: true },
        ],
        focus: { durationMinutes: 500, remainingSeconds: -20, linkedTaskId: 'missing' },
        tabSession: {
          tabs: [
            { id: 'safe-tab', title: 'Vite', url: 'https://vite.dev/' },
            { id: 'unsafe-tab', title: 'Unsafe', url: 'javascript:alert(1)' },
          ],
        },
      },
    ],
    activeWorkspaceId: 'workspace-project',
  })
  const workspace = getActiveWorkspace(data)
  assert.equal(workspace.repository, 'Caleb-Guyer/DevTab')
  assert.equal(workspace.tasks.length, 1)
  assert.equal(workspace.focus.durationMinutes, 120)
  assert.equal(workspace.focus.remainingSeconds, 0)
  assert.equal(workspace.focus.linkedTaskId, '')
  assert.deepEqual(workspace.tabSession.tabs.map((tab) => tab.url), ['https://vite.dev/'])
})
