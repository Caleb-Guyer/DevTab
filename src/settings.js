import { ACCENT_IDS, DEFAULT_SETTINGS, DEFAULT_WORKSPACE_LAYOUT, createDefaultData } from './config.js'
import { getActiveWorkspace } from './state.js'

export function setupSettings(store) {
  const root = document.documentElement
  const form = document.querySelector('#settings-form')
  const status = document.querySelector('#settings-status')
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
  const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const exportButton = document.querySelector('#export-settings')
  const importButton = document.querySelector('#import-settings-button')
  const importInput = document.querySelector('#import-settings')
  const resetButton = document.querySelector('#reset-dashboard')
  const searchEngine = document.querySelector('#settings-search-engine')
  const contrast = document.querySelector('#contrast-setting')
  const motion = document.querySelector('#motion-setting')

  function setStatus(message, state = 'saved') {
    status.textContent = message
    status.dataset.state = state
  }

  function resolveTheme(theme) {
    return theme === 'system' ? (systemTheme.matches ? 'dark' : 'light') : theme
  }

  function resolveMotion(value) {
    return value === 'system' ? (systemMotion.matches ? 'reduced' : 'full') : value
  }

  function checkValue(name, value) {
    const input = form.querySelector(`[name="${name}"][value="${value}"]`)
    if (input) input.checked = true
  }

  function apply(state) {
    const settings = state.settings
    const workspace = getActiveWorkspace(state)
    const resolvedTheme = resolveTheme(settings.theme)
    root.dataset.theme = resolvedTheme
    root.dataset.accent = workspace.accent
    root.dataset.backgroundIntensity = settings.backgroundIntensity
    root.dataset.contrast = settings.contrast
    root.dataset.motion = resolveMotion(settings.motion)
    root.style.colorScheme = resolvedTheme

    checkValue('theme', settings.theme)
    checkValue('accent', workspace.accent)
    checkValue('background-intensity', settings.backgroundIntensity)
    form.querySelectorAll('[name="visible-card"]').forEach((input) => {
      input.checked = workspace.visibleCards.includes(input.value)
    })
    searchEngine.value = settings.searchEngine
    contrast.value = settings.contrast
    motion.value = settings.motion
  }

  function saveFromControls() {
    const persisted = store.update(
      (data) => {
        const workspace = getActiveWorkspace(data)
        data.settings.theme = form.querySelector('[name="theme"]:checked')?.value || 'system'
        workspace.accent = form.querySelector('[name="accent"]:checked')?.value || 'mint'
        data.settings.backgroundIntensity =
          form.querySelector('[name="background-intensity"]:checked')?.value || 'balanced'
        workspace.visibleCards = [...form.querySelectorAll('[name="visible-card"]:checked')].map(
          (input) => input.value,
        )
        data.settings.searchEngine = searchEngine.value
        data.settings.contrast = contrast.value
        data.settings.motion = motion.value
        return data
      },
      { source: 'settings' },
    )
    setStatus(
      persisted ? 'Preferences saved.' : 'Changes apply for this visit but could not be saved.',
      persisted ? 'saved' : 'error',
    )
  }

  function downloadData() {
    const blob = new Blob([JSON.stringify(store.getState(), null, 2)], {
      type: 'application/json',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `devtab-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
    setStatus('Dashboard exported.')
  }

  async function importData(file) {
    try {
      const imported = JSON.parse(await file.text())
      const persisted = store.replace(imported, { source: 'import' })
      setStatus(
        persisted ? 'Dashboard imported.' : 'Import applied but could not be saved.',
        persisted ? 'saved' : 'error',
      )
    } catch (error) {
      console.warn('DevTab could not import that backup.', error)
      setStatus('That file is not a valid DevTab backup.', 'error')
    } finally {
      importInput.value = ''
    }
  }

  function resetSetting(setting) {
    store.update(
      (data) => {
        const workspace = getActiveWorkspace(data)
        if (setting === 'accessibility') {
          data.settings.contrast = DEFAULT_SETTINGS.contrast
          data.settings.motion = DEFAULT_SETTINGS.motion
        } else if (setting === 'accent') {
          workspace.accent = 'mint'
        } else if (setting === 'visibleCards') {
          workspace.visibleCards = [...DEFAULT_WORKSPACE_LAYOUT.visibleCards]
        } else {
          data.settings[setting] = structuredClone(DEFAULT_SETTINGS[setting])
        }
        return data
      },
      { source: 'settings' },
    )
    setStatus('That preference was reset.')
  }

  form.addEventListener('change', saveFromControls)
  form.querySelectorAll('[data-reset-setting]').forEach((button) => {
    button.addEventListener('click', () => resetSetting(button.dataset.resetSetting))
  })
  exportButton.addEventListener('click', downloadData)
  importButton.addEventListener('click', () => importInput.click())
  importInput.addEventListener('change', () => {
    const [file] = importInput.files
    if (file) importData(file)
  })
  resetButton.addEventListener('click', () => {
    if (!window.confirm('Reset links, notes, favorites, and every preference?')) return
    store.replace(createDefaultData(), { source: 'reset' })
    setStatus('DevTab was reset to its defaults.')
  })

  systemTheme.addEventListener('change', () => apply(store.getState()))
  systemMotion.addEventListener('change', () => apply(store.getState()))
  store.subscribe((state) => apply(state))
  apply(store.getState())
  setStatus(store.getStorageError() ? 'Storage is unavailable; changes are temporary.' : 'Preferences loaded.', store.getStorageError() ? 'error' : 'saved')

  return {
    showCard(cardId) {
      if (getActiveWorkspace(store.getState()).visibleCards.includes(cardId)) return
      store.update((data) => {
        getActiveWorkspace(data).visibleCards.push(cardId)
        return data
      })
    },
    toggleTheme() {
      store.update((data) => {
        const current = resolveTheme(data.settings.theme)
        data.settings.theme = current === 'dark' ? 'light' : 'dark'
        return data
      })
    },
    setAppearance(value) {
      const normalized = value.toLowerCase()
      const themes = ['system', 'light', 'dark']
      const accents = ACCENT_IDS
      if (![...themes, ...accents].includes(normalized)) return false
      store.update((data) => {
        if (themes.includes(normalized)) data.settings.theme = normalized
        if (accents.includes(normalized)) getActiveWorkspace(data).accent = normalized
        return data
      })
      return true
    },
  }
}
