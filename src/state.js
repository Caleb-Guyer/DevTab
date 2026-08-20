import {
  APP_STORAGE_KEY,
  APP_VERSION,
  CARD_IDS,
  DEFAULT_LINKS,
  DEFAULT_SETTINGS,
  LEGACY_NOTE_STORAGE_KEY,
  LEGACY_SETTINGS_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
  SEARCH_ENGINE_IDS,
  createDefaultData,
  createDefaultNote,
} from './config.js'

const THEME_IDS = ['system', 'light', 'dark']
const ACCENT_IDS = ['mint', 'violet', 'amber', 'azure']
const INTENSITY_IDS = ['subtle', 'balanced', 'strong']
const CONTRAST_IDS = ['standard', 'high']
const MOTION_IDS = ['system', 'full', 'reduced']
const WEATHER_MODES = ['auto', 'manual']
const WEATHER_UNITS = ['auto', 'fahrenheit', 'celsius']

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

export function validateSettings(value = {}) {
  const weather = value.weather && typeof value.weather === 'object' ? value.weather : {}
  const cardOrder = uniqueAllowed(value.cardOrder, CARD_IDS, DEFAULT_SETTINGS.cardOrder)

  CARD_IDS.forEach((card) => {
    if (!cardOrder.includes(card)) cardOrder.push(card)
  })

  return {
    theme: allowedValue(value.theme, THEME_IDS, DEFAULT_SETTINGS.theme),
    accent: allowedValue(value.accent, ACCENT_IDS, DEFAULT_SETTINGS.accent),
    backgroundIntensity: allowedValue(
      value.backgroundIntensity,
      INTENSITY_IDS,
      DEFAULT_SETTINGS.backgroundIntensity,
    ),
    contrast: allowedValue(value.contrast, CONTRAST_IDS, DEFAULT_SETTINGS.contrast),
    motion: allowedValue(value.motion, MOTION_IDS, DEFAULT_SETTINGS.motion),
    visibleCards: uniqueAllowed(value.visibleCards, CARD_IDS, DEFAULT_SETTINGS.visibleCards),
    cardOrder,
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

function validHttpUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
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

function validIsoDate(value, fallback) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback
}

function validateNotes(value, legacyNote = '') {
  const now = new Date().toISOString()
  const notes = Array.isArray(value)
    ? value
        .filter((note) => note && typeof note.id === 'string')
        .map((note) => ({
          id: note.id.slice(0, 100),
          title:
            typeof note.title === 'string' && note.title.trim()
              ? note.title.trim().slice(0, 100)
              : 'Untitled note',
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

export function validateAppData(value, legacyNote = '') {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const notes = validateNotes(source.notes, legacyNote)
  const activeNoteId = notes.some((note) => note.id === source.activeNoteId)
    ? source.activeNoteId
    : notes[0].id

  return {
    version: APP_VERSION,
    settings: validateSettings(source.settings),
    links: validateLinks(source.links),
    notes,
    activeNoteId,
    favoriteRepositories: Array.isArray(source.favoriteRepositories)
      ? source.favoriteRepositories
          .filter((name) => typeof name === 'string')
          .map((name) => name.slice(0, 100))
          .filter((name, index, names) => names.indexOf(name) === index)
      : [],
  }
}

function readLegacyData(storage) {
  const legacyNote = storage.getItem(LEGACY_NOTE_STORAGE_KEY) || ''
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
    return { data, error: null }
  } catch (error) {
    console.warn('DevTab could not load its saved data.', error)
    return { data: createDefaultData(), error }
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
