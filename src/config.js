export const APP_VERSION = 2
export const APP_STORAGE_KEY = 'devtab.data.v2'
export const LEGACY_NOTE_STORAGE_KEY = 'devtab.quick-note'
export const LEGACY_SETTINGS_STORAGE_KEY = 'devtab.settings'
export const LEGACY_THEME_STORAGE_KEY = 'devtab.theme'
export const GITHUB_USERNAME = 'Caleb-Guyer'
export const CARD_IDS = ['weather', 'github', 'links', 'notes']
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
  accent: 'mint',
  backgroundIntensity: 'balanced',
  contrast: 'standard',
  motion: 'system',
  visibleCards: [...CARD_IDS],
  cardOrder: [...CARD_IDS],
  searchEngine: 'google',
  weather: {
    locationMode: 'auto',
    locationName: '',
    latitude: null,
    longitude: null,
    unit: 'auto',
  },
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

export function createDefaultData(legacyNote = '') {
  const note = createDefaultNote(legacyNote)

  return {
    version: APP_VERSION,
    settings: structuredClone(DEFAULT_SETTINGS),
    links: structuredClone(DEFAULT_LINKS),
    notes: [note],
    activeNoteId: note.id,
    favoriteRepositories: [],
  }
}
