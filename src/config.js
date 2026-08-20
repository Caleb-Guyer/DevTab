export const APP_VERSION = 3
export const APP_STORAGE_KEY = 'devtab.data.v3'
export const LEGACY_APP_STORAGE_KEY = 'devtab.data.v2'
export const LEGACY_NOTE_STORAGE_KEY = 'devtab.quick-note'
export const LEGACY_SETTINGS_STORAGE_KEY = 'devtab.settings'
export const LEGACY_THEME_STORAGE_KEY = 'devtab.theme'
export const GITHUB_USERNAME = 'Caleb-Guyer'
export const ACCENT_IDS = ['mint', 'violet', 'amber', 'azure']
export const CARD_IDS = ['project', 'focus', 'tasks', 'session', 'weather', 'github', 'links', 'notes']
export const SEARCH_ENGINE_IDS = ['google', 'duckduckgo', 'github', 'mdn']

export const DEFAULT_LINKS = [
  { id: 'github', label: 'GitHub', url: 'https://github.com/', mark: 'GH' },
  { id: 'mdn', label: 'MDN', url: 'https://developer.mozilla.org/', mark: 'MDN' },
  { id: 'vite', label: 'Vite', url: 'https://vite.dev/', mark: 'V' },
  {
    id: 'stack-overflow',
    label: 'Stack Overflow',
    url: 'https://stackoverflow.com/',
    mark: 'SO',
  },
]

export const DEFAULT_SETTINGS = {
  theme: 'system',
  backgroundIntensity: 'balanced',
  contrast: 'standard',
  motion: 'system',
  searchEngine: 'google',
  weather: {
    locationMode: 'auto',
    locationName: '',
    latitude: null,
    longitude: null,
    unit: 'auto',
  },
}

export const DEFAULT_WORKSPACE_LAYOUT = {
  visibleCards: [...CARD_IDS],
  cardOrder: [...CARD_IDS],
}

function workspaceIcon(name) {
  const parts = name.match(/[A-Z]+(?=[A-Z][a-z]|\b)|[A-Z]?[a-z]+|\d+/g) || [name]
  return (parts.length > 1 ? parts.map((part) => part[0]).join('') : parts[0].slice(0, 2))
    .slice(0, 3)
    .toUpperCase() || 'WS'
}

export function createDefaultNote(content = '') {
  const now = new Date().toISOString()

  return {
    id: `note-${Date.now()}`,
    title: 'Scratch',
    content,
    createdAt: now,
    updatedAt: now,
    pinned: true,
  }
}

export function createDefaultWorkspace({ id, name = 'DevTab', legacyNote = '' } = {}) {
  const now = new Date().toISOString()
  const note = createDefaultNote(legacyNote)
  const workspaceId = id || `workspace-${Date.now()}`

  return {
    id: workspaceId,
    name,
    command: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace',
    icon: workspaceIcon(name),
    description: 'Pick up exactly where you left off.',
    accent: 'mint',
    repository: 'Caleb-Guyer/DevTab',
    links: structuredClone(DEFAULT_LINKS),
    notes: [note],
    activeNoteId: note.id,
    favoriteRepositories: [],
    tasks: [],
    focus: {
      durationMinutes: 25,
      remainingSeconds: 25 * 60,
      status: 'idle',
      endsAt: null,
      sessionsCompleted: 0,
      linkedTaskId: '',
    },
    tabSession: {
      tabs: [],
      capturedAt: null,
    },
    visibleCards: [...DEFAULT_WORKSPACE_LAYOUT.visibleCards],
    cardOrder: [...DEFAULT_WORKSPACE_LAYOUT.cardOrder],
    createdAt: now,
    updatedAt: now,
  }
}

export function createDefaultData(legacyNote = '') {
  const workspace = createDefaultWorkspace({ legacyNote })

  return {
    version: APP_VERSION,
    settings: structuredClone(DEFAULT_SETTINGS),
    workspaces: [workspace],
    activeWorkspaceId: workspace.id,
  }
}
