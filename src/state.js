import {
  ACCENT_IDS,
  APP_STORAGE_KEY,
  APP_VERSION,
  CARD_IDS,
  DEFAULT_LINKS,
  DEFAULT_SETTINGS,
  DEFAULT_WORKSPACE_LAYOUT,
  LEGACY_APP_STORAGE_KEY,
  LEGACY_NOTE_STORAGE_KEY,
  LEGACY_SETTINGS_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
  SEARCH_ENGINE_IDS,
  createDefaultData,
  createDefaultNote,
  createDefaultWorkspace,
} from './config.js'

const THEME_IDS = ['system', 'light', 'dark']
const INTENSITY_IDS = ['subtle', 'balanced', 'strong']
const CONTRAST_IDS = ['standard', 'high']
const MOTION_IDS = ['system', 'full', 'reduced']
const WEATHER_MODES = ['auto', 'manual']
const WEATHER_UNITS = ['auto', 'fahrenheit', 'celsius']
const FOCUS_STATES = ['idle', 'running', 'paused']

function uniqueAllowed(value, allowed, fallback) {
  if (!Array.isArray(value)) return [...fallback]
  return value.filter(
    (item, index, items) => allowed.includes(item) && items.indexOf(item) === index,
  )
}

function allowedValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

function validCoordinate(value, minimum, maximum) {
  return Number.isFinite(value) && value >= minimum && value <= maximum ? value : null
}

function validIsoDate(value, fallback) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback
}

function validHttpUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

function text(value, fallback, maximum) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maximum) : fallback
}

function workspaceCommand(value, fallback = 'workspace') {
  const command = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return command || fallback
}

export function validateSettings(value = {}) {
  const weather = value.weather && typeof value.weather === 'object' ? value.weather : {}

  return {
    theme: allowedValue(value.theme, THEME_IDS, DEFAULT_SETTINGS.theme),
    backgroundIntensity: allowedValue(
      value.backgroundIntensity,
      INTENSITY_IDS,
      DEFAULT_SETTINGS.backgroundIntensity,
    ),
    contrast: allowedValue(value.contrast, CONTRAST_IDS, DEFAULT_SETTINGS.contrast),
    motion: allowedValue(value.motion, MOTION_IDS, DEFAULT_SETTINGS.motion),
    searchEngine: allowedValue(
      value.searchEngine,
      SEARCH_ENGINE_IDS,
      DEFAULT_SETTINGS.searchEngine,
    ),
    weather: {
      locationMode: allowedValue(
        weather.locationMode,
        WEATHER_MODES,
        DEFAULT_SETTINGS.weather.locationMode,
      ),
      locationName:
        typeof weather.locationName === 'string' ? weather.locationName.slice(0, 120) : '',
      latitude: validCoordinate(weather.latitude, -90, 90),
      longitude: validCoordinate(weather.longitude, -180, 180),
      unit: allowedValue(weather.unit, WEATHER_UNITS, DEFAULT_SETTINGS.weather.unit),
    },
  }
}

function validateLinks(value) {
  if (!Array.isArray(value)) return structuredClone(DEFAULT_LINKS)

  return value
    .filter(
      (link) =>
        link &&
        typeof link.id === 'string' &&
        typeof link.label === 'string' &&
        validHttpUrl(link.url),
    )
    .map((link) => ({
      id: link.id.slice(0, 80),
      label: link.label.trim().slice(0, 80) || 'Untitled link',
      url: link.url,
      mark:
        typeof link.mark === 'string' && link.mark.trim()
          ? link.mark.trim().slice(0, 4).toUpperCase()
          : link.label.slice(0, 2).toUpperCase(),
    }))
    .filter((link, index, links) => links.findIndex((item) => item.id === link.id) === index)
}

function validateNotes(value, legacyNote = '') {
  const now = new Date().toISOString()
  const notes = Array.isArray(value)
    ? value
        .filter((note) => note && typeof note.id === 'string')
        .map((note) => ({
          id: note.id.slice(0, 100),
          title: text(note.title, 'Untitled note', 100),
          content: typeof note.content === 'string' ? note.content.slice(0, 200000) : '',
          createdAt: validIsoDate(note.createdAt, now),
          updatedAt: validIsoDate(note.updatedAt, now),
          pinned: Boolean(note.pinned),
        }))
        .filter(
          (note, index, notesList) =>
            notesList.findIndex((item) => item.id === note.id) === index,
        )
    : []

  return notes.length > 0 ? notes : [createDefaultNote(legacyNote)]
}

function validateTasks(value) {
  const now = new Date().toISOString()
  if (!Array.isArray(value)) return []
  return value
    .filter((task) => task && typeof task.id === 'string' && typeof task.title === 'string')
    .map((task) => ({
      id: task.id.slice(0, 100),
      title: text(task.title, 'Untitled task', 160),
      completed: Boolean(task.completed),
      createdAt: validIsoDate(task.createdAt, now),
      completedAt: task.completed ? validIsoDate(task.completedAt, now) : null,
    }))
    .filter((task, index, tasks) => tasks.findIndex((item) => item.id === task.id) === index)
    .slice(0, 250)
}

function validateFocus(value, tasks) {
  const source = value && typeof value === 'object' ? value : {}
  const durationMinutes = Number.isInteger(source.durationMinutes)
    ? Math.min(120, Math.max(5, source.durationMinutes))
    : 25
  const maximumSeconds = durationMinutes * 60
  const remainingSeconds = Number.isFinite(source.remainingSeconds)
    ? Math.min(maximumSeconds, Math.max(0, Math.round(source.remainingSeconds)))
    : maximumSeconds
  const linkedTaskId = tasks.some((task) => task.id === source.linkedTaskId)
    ? source.linkedTaskId
    : ''

  return {
    durationMinutes,
    remainingSeconds,
    status: allowedValue(source.status, FOCUS_STATES, 'idle'),
    endsAt: Number.isFinite(source.endsAt) ? source.endsAt : null,
    sessionsCompleted: Number.isInteger(source.sessionsCompleted)
      ? Math.min(9999, Math.max(0, source.sessionsCompleted))
      : 0,
    linkedTaskId,
  }
}

function validateTabSession(value) {
  const source = value && typeof value === 'object' ? value : {}
  const tabs = Array.isArray(source.tabs)
    ? source.tabs
        .filter((tab) => tab && validHttpUrl(tab.url))
        .map((tab) => ({
          id: text(tab.id, `tab-${Math.random().toString(36).slice(2)}`, 100),
          title: text(tab.title, new URL(tab.url).hostname, 160),
          url: tab.url,
          favIconUrl: validHttpUrl(tab.favIconUrl) ? tab.favIconUrl : '',
        }))
        .filter((tab, index, tabsList) => tabsList.findIndex((item) => item.url === tab.url) === index)
        .slice(0, 50)
    : []

  return {
    tabs,
    capturedAt: source.capturedAt ? validIsoDate(source.capturedAt, null) : null,
  }
}

function validateRepository(value) {
  if (typeof value !== 'string') return ''
  const normalized = value
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '')
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalized) ? normalized.slice(0, 200) : ''
}

function validateWorkspace(value, index = 0) {
  const source = value && typeof value === 'object' ? value : {}
  const fallback = createDefaultWorkspace({ id: `workspace-${Date.now()}-${index}` })
  const now = new Date().toISOString()
  const name = text(source.name, index === 0 ? 'DevTab' : `Workspace ${index + 1}`, 80)
  const notes = validateNotes(source.notes)
  const tasks = validateTasks(source.tasks)
  const cardOrder = uniqueAllowed(source.cardOrder, CARD_IDS, DEFAULT_WORKSPACE_LAYOUT.cardOrder)
  CARD_IDS.forEach((card) => {
    if (!cardOrder.includes(card)) cardOrder.push(card)
  })

  return {
    id: text(source.id, fallback.id, 100),
    name,
    command: workspaceCommand(source.command, workspaceCommand(name)),
    icon: text(source.icon, fallback.icon, 3).toUpperCase(),
    description: text(source.description, fallback.description, 240),
    accent: allowedValue(source.accent, ACCENT_IDS, fallback.accent),
    repository: validateRepository(source.repository),
    links: validateLinks(source.links),
    notes,
    activeNoteId: notes.some((note) => note.id === source.activeNoteId)
      ? source.activeNoteId
      : notes[0].id,
    favoriteRepositories: Array.isArray(source.favoriteRepositories)
      ? source.favoriteRepositories
          .filter((item) => typeof item === 'string')
          .map((item) => item.slice(0, 100))
          .filter((item, itemIndex, items) => items.indexOf(item) === itemIndex)
      : [],
    tasks,
    focus: validateFocus(source.focus, tasks),
    tabSession: validateTabSession(source.tabSession),
    visibleCards: uniqueAllowed(
      source.visibleCards,
      CARD_IDS,
      DEFAULT_WORKSPACE_LAYOUT.visibleCards,
    ),
    cardOrder,
    createdAt: validIsoDate(source.createdAt, now),
    updatedAt: validIsoDate(source.updatedAt, now),
  }
}

function migrateV2Data(value, legacyNote = '') {
  const source = value && typeof value === 'object' ? value : {}
  const oldSettings = source.settings && typeof source.settings === 'object' ? source.settings : {}
  const workspace = createDefaultWorkspace({ legacyNote })
  workspace.accent = allowedValue(oldSettings.accent, ACCENT_IDS, workspace.accent)
  const legacyVisibleCards = uniqueAllowed(
    oldSettings.visibleCards,
    CARD_IDS,
    ['weather', 'github', 'links', 'notes'],
  )
  workspace.visibleCards = [
    'project',
    'focus',
    'tasks',
    'session',
    ...legacyVisibleCards,
  ]
  const legacyCardOrder = uniqueAllowed(
    oldSettings.cardOrder,
    CARD_IDS,
    ['weather', 'github', 'links', 'notes'],
  )
  workspace.cardOrder = ['project', 'focus', 'tasks', 'session', ...legacyCardOrder]
  workspace.links = source.links
  workspace.notes = source.notes
  workspace.activeNoteId = source.activeNoteId
  workspace.favoriteRepositories = source.favoriteRepositories

  return {
    version: APP_VERSION,
    settings: validateSettings(oldSettings),
    workspaces: [validateWorkspace(workspace)],
    activeWorkspaceId: workspace.id,
  }
}

export function validateAppData(value, legacyNote = '') {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  if (!Array.isArray(source.workspaces)) return migrateV2Data(source, legacyNote)

  const workspaces = source.workspaces
    .slice(0, 24)
    .map((workspace, index) => validateWorkspace(workspace, index))
    .filter(
      (workspace, index, items) => items.findIndex((item) => item.id === workspace.id) === index,
    )
  if (workspaces.length === 0) workspaces.push(createDefaultWorkspace())
  const activeWorkspaceId = workspaces.some((workspace) => workspace.id === source.activeWorkspaceId)
    ? source.activeWorkspaceId
    : workspaces[0].id

  return {
    version: APP_VERSION,
    settings: validateSettings(source.settings),
    workspaces,
    activeWorkspaceId,
  }
}

export function getActiveWorkspace(state) {
  return (
    state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId) ||
    state.workspaces[0]
  )
}

function readLegacyData(storage) {
  const legacyNote = storage.getItem(LEGACY_NOTE_STORAGE_KEY) || ''
  const storedV2 = storage.getItem(LEGACY_APP_STORAGE_KEY)
  if (storedV2) return validateAppData(JSON.parse(storedV2), legacyNote)

  const data = createDefaultData(legacyNote)
  const storedSettings = storage.getItem(LEGACY_SETTINGS_STORAGE_KEY)
  if (storedSettings) {
    data.settings = validateSettings(JSON.parse(storedSettings))
  } else {
    const legacyTheme = storage.getItem(LEGACY_THEME_STORAGE_KEY)
    if (THEME_IDS.includes(legacyTheme)) data.settings.theme = legacyTheme
  }
  return data
}

export function loadAppData(storage) {
  try {
    const storedData = storage.getItem(APP_STORAGE_KEY)
    const data = storedData ? validateAppData(JSON.parse(storedData)) : readLegacyData(storage)
    return { data, error: null, migrated: !storedData }
  } catch (error) {
    console.warn('DevTab could not load its saved data.', error)
    return { data: createDefaultData(), error, migrated: false }
  }
}

export function createStore(storage = window.localStorage) {
  const loaded = loadAppData(storage)
  let state = loaded.data
  let storageError = loaded.error
  const listeners = new Set()

  function persist() {
    try {
      storage.setItem(APP_STORAGE_KEY, JSON.stringify(state))
      storage.removeItem(LEGACY_APP_STORAGE_KEY)
      storage.removeItem(LEGACY_NOTE_STORAGE_KEY)
      storage.removeItem(LEGACY_SETTINGS_STORAGE_KEY)
      storage.removeItem(LEGACY_THEME_STORAGE_KEY)
      storageError = null
      return true
    } catch (error) {
      console.warn('DevTab could not save its data.', error)
      storageError = error
      return false
    }
  }

  function notify(meta = {}) {
    listeners.forEach((listener) => listener(state, { ...meta, storageError }))
  }

  function update(updater, meta = {}) {
    const draft = structuredClone(state)
    const result = updater(draft) ?? draft
    state = validateAppData(result)
    const persisted = persist()
    notify({ ...meta, persisted })
    return persisted
  }

  function replace(value, meta = {}) {
    state = validateAppData(value)
    const persisted = persist()
    notify({ ...meta, persisted })
    return persisted
  }

  if (loaded.migrated) persist()

  return {
    getState: () => state,
    getStorageError: () => storageError,
    update,
    replace,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function readCache(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(`devtab.cache.${key}`))
    if (!value || typeof value.savedAt !== 'number') return null
    return { ...value, age: Date.now() - value.savedAt }
  } catch {
    return null
  }
}

export function writeCache(storage, key, data) {
  try {
    storage.setItem(`devtab.cache.${key}`, JSON.stringify({ savedAt: Date.now(), data }))
    return true
  } catch (error) {
    console.warn(`DevTab could not cache ${key}.`, error)
    return false
  }
}
