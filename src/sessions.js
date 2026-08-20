import { getActiveWorkspace } from './state.js'
import { createId, formatRelativeTime, normalizeLinkUrl } from './utilities.js'

function extensionTabsApi() {
  if (globalThis.browser?.tabs?.query) return { tabs: globalThis.browser.tabs, promiseBased: true }
  if (globalThis.chrome?.tabs?.query) return { tabs: globalThis.chrome.tabs, promiseBased: false }
  return null
}

function chromeCall(method, ...args) {
  return new Promise((resolve, reject) => {
    method(...args, (result) => {
      const error = globalThis.chrome?.runtime?.lastError
      if (error) reject(new Error(error.message))
      else resolve(result)
    })
  })
}

function safeTab(tab) {
  try {
    const url = new URL(tab.url)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return {
      id: createId('tab'),
      title: (tab.title || url.hostname).slice(0, 160),
      url: url.href,
      favIconUrl: /^https?:/i.test(tab.favIconUrl || '') ? tab.favIconUrl : '',
    }
  } catch {
    return null
  }
}

export function setupSessions(store) {
  const api = extensionTabsApi()
  const captureButton = document.querySelector('#session-capture')
  const restoreButton = document.querySelector('#session-restore')
  const clearButton = document.querySelector('#session-clear')
  const mode = document.querySelector('#session-mode')
  const status = document.querySelector('#session-status')
  const list = document.querySelector('#session-list')
  const form = document.querySelector('#session-form')
  const input = document.querySelector('#session-url')

  function setStatus(message, state = 'ready') {
    status.textContent = message
    status.dataset.state = state
  }

  async function capture() {
    if (!api) {
      setStatus('Window capture is available in the DevTab browser extension.', 'info')
      return false
    }
    captureButton.disabled = true
    setStatus('Reading the tabs in this window…', 'loading')
    try {
      const rawTabs = api.promiseBased
        ? await api.tabs.query({ currentWindow: true })
        : await chromeCall(api.tabs.query.bind(api.tabs), { currentWindow: true })
      const tabs = rawTabs.map(safeTab).filter(Boolean)
      if (tabs.length === 0) throw new Error('No web tabs were available to capture.')
      store.update(
        (data) => {
          const workspace = getActiveWorkspace(data)
          workspace.tabSession.tabs = tabs
          workspace.tabSession.capturedAt = new Date().toISOString()
          workspace.updatedAt = workspace.tabSession.capturedAt
          return data
        },
        { source: 'sessions', action: 'capture' },
      )
      setStatus(`Captured ${tabs.length} web ${tabs.length === 1 ? 'tab' : 'tabs'} from this window.`)
      return true
    } catch (error) {
      console.warn('DevTab could not capture the current tab session.', error)
      setStatus(error.message || 'The current window could not be captured.', 'error')
      return false
    } finally {
      captureButton.disabled = false
    }
  }

  async function restore() {
    const workspace = getActiveWorkspace(store.getState())
    const tabs = workspace.tabSession.tabs
    if (tabs.length === 0) {
      setStatus('Add or capture at least one tab before launching this workspace.', 'info')
      return false
    }
    restoreButton.disabled = true
    try {
      if (api) {
        for (const tab of tabs) {
          if (api.promiseBased) await api.tabs.create({ url: tab.url, active: false })
          else await chromeCall(api.tabs.create.bind(api.tabs), { url: tab.url, active: false })
        }
        setStatus(`Restored ${tabs.length} tabs in this browser window.`)
      } else {
        let opened = 0
        tabs.forEach((tab) => {
          const openedTab = window.open(tab.url, '_blank')
          if (openedTab) {
            openedTab.opener = null
            opened += 1
          }
        })
        setStatus(
          opened === tabs.length
            ? `Opened ${opened} workspace tabs.`
            : `Opened ${opened} of ${tabs.length}; allow pop-ups to launch the complete session.`,
          opened === tabs.length ? 'ready' : 'info',
        )
      }
      return true
    } catch (error) {
      console.warn('DevTab could not restore the saved tab session.', error)
      setStatus(error.message || 'The saved session could not be restored.', 'error')
      return false
    } finally {
      restoreButton.disabled = false
    }
  }

  function addUrl(value) {
    try {
      const url = normalizeLinkUrl(value)
      const title = new URL(url).hostname.replace(/^www\./, '')
      store.update(
        (data) => {
          const workspace = getActiveWorkspace(data)
          if (!workspace.tabSession.tabs.some((tab) => tab.url === url)) {
            workspace.tabSession.tabs.push({ id: createId('tab'), title, url, favIconUrl: '' })
          }
          workspace.tabSession.capturedAt = new Date().toISOString()
          return data
        },
        { source: 'sessions', action: 'add' },
      )
      setStatus(`Added ${title} to this workspace session.`)
      return true
    } catch (error) {
      setStatus(error.message, 'error')
      return false
    }
  }

  function remove(tabId) {
    store.update(
      (data) => {
        const session = getActiveWorkspace(data).tabSession
        session.tabs = session.tabs.filter((tab) => tab.id !== tabId)
        session.capturedAt = new Date().toISOString()
        return data
      },
      { source: 'sessions', action: 'remove' },
    )
  }

  function render() {
    const workspace = getActiveWorkspace(store.getState())
    const session = workspace.tabSession
    mode.textContent = api ? 'Extension mode / window access ready' : 'Website mode / add URLs manually'
    captureButton.hidden = !api
    restoreButton.disabled = session.tabs.length === 0
    clearButton.disabled = session.tabs.length === 0
    if (!status.dataset.state || status.dataset.workspace !== workspace.id) {
      status.dataset.workspace = workspace.id
      setStatus(
        session.tabs.length
          ? `${session.tabs.length} saved ${session.tabs.length === 1 ? 'tab' : 'tabs'}${session.capturedAt ? ` · updated ${formatRelativeTime(session.capturedAt)}` : ''}`
          : api
            ? 'Capture this window or add individual URLs.'
            : 'Add the pages you want DevTab to reopen together.',
      )
    }

    if (session.tabs.length === 0) {
      const item = document.createElement('li')
      item.className = 'session-empty'
      item.textContent = 'No saved tabs in this workspace.'
      list.replaceChildren(item)
      return
    }
    list.replaceChildren(
      ...session.tabs.map((tab, index) => {
        const item = document.createElement('li')
        const link = document.createElement('a')
        const number = document.createElement('span')
        const copy = document.createElement('span')
        const title = document.createElement('span')
        const host = document.createElement('span')
        const removeButton = document.createElement('button')
        number.className = 'session-index'
        number.textContent = String(index + 1).padStart(2, '0')
        link.href = tab.url
        link.target = '_blank'
        link.rel = 'noreferrer'
        copy.className = 'session-copy'
        title.className = 'session-title'
        title.textContent = tab.title
        host.className = 'session-host'
        host.textContent = new URL(tab.url).hostname
        removeButton.type = 'button'
        removeButton.className = 'session-remove'
        removeButton.textContent = '×'
        removeButton.setAttribute('aria-label', `Remove ${tab.title} from this session`)
        removeButton.addEventListener('click', () => remove(tab.id))
        copy.append(title, host)
        link.append(number, copy)
        item.append(link, removeButton)
        return item
      }),
    )
  }

  captureButton.addEventListener('click', capture)
  restoreButton.addEventListener('click', restore)
  clearButton.addEventListener('click', () => {
    const workspace = getActiveWorkspace(store.getState())
    if (!window.confirm(`Clear all ${workspace.tabSession.tabs.length} saved tabs from “${workspace.name}”?`)) return
    store.update(
      (data) => {
        getActiveWorkspace(data).tabSession = { tabs: [], capturedAt: null }
        return data
      },
      { source: 'sessions', action: 'clear' },
    )
    setStatus('Saved session cleared.')
  })
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (addUrl(input.value)) input.value = ''
  })
  store.subscribe(render)
  render()

  return { capture, restore, addUrl }
}
