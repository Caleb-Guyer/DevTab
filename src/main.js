import './style.css'
import { setupCards } from './cards.js'
import { setupClock } from './clock.js'
import { setupGitHub } from './github.js'
import { setupFocus } from './focus.js'
import { setupLauncher } from './launcher.js'
import { setupLinks } from './links.js'
import { setupNotes } from './notes.js'
import { setupProject } from './project.js'
import { setupServiceWorker } from './pwa.js'
import { setupSearch } from './search.js'
import { setupSessions } from './sessions.js'
import { setupSettings } from './settings.js'
import { createStore } from './state.js'
import { setupTasks } from './tasks.js'
import { setupWeather } from './weather.js'
import { setupWorkspaces } from './workspaces.js'

const store = createStore()

setupClock()
const workspaces = setupWorkspaces(store)
setupCards(store)
const settings = setupSettings(store)
const links = setupLinks(store)
const notes = setupNotes(store)
const tasks = setupTasks(store)
const focus = setupFocus(store)
const sessions = setupSessions(store)
setupWeather(store)
setupGitHub(store)
setupProject({ store, workspaces, sessions })
const launcher = setupLauncher({
  store,
  links,
  notes,
  settings,
  workspaces,
  tasks,
  sessions,
  focus,
})
const search = setupSearch(store, launcher)

function isEditing(target) {
  return (
    target instanceof HTMLElement &&
    (target.matches('input, textarea, select') || target.isContentEditable)
  )
}

document.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.repeat || event.altKey) return

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    launcher.open()
    return
  }

  if ((event.ctrlKey || event.metaKey) && /^[1-9]$/.test(event.key)) {
    const switched = workspaces.switchByIndex(Number(event.key) - 1)
    if (switched) event.preventDefault()
    return
  }

  if (event.ctrlKey || event.metaKey || isEditing(event.target)) return

  if (event.key === '/') {
    event.preventDefault()
    search.focus()
  }
  if (event.key.toLowerCase() === 'n') {
    event.preventDefault()
    settings.showCard('notes')
    notes.focus()
  }
  if (event.key.toLowerCase() === 't') {
    event.preventDefault()
    settings.toggleTheme()
  }
})

setupServiceWorker()
