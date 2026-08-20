import './style.css'
import { setupCards } from './cards.js'
import { setupClock } from './clock.js'
import { setupGitHub } from './github.js'
import { setupLauncher } from './launcher.js'
import { setupLinks } from './links.js'
import { setupNotes } from './notes.js'
import { setupServiceWorker } from './pwa.js'
import { setupSearch } from './search.js'
import { setupSettings } from './settings.js'
import { createStore } from './state.js'
import { setupWeather } from './weather.js'

const store = createStore()

setupClock()
setupCards(store)
const settings = setupSettings(store)
const links = setupLinks(store)
const notes = setupNotes(store)
setupWeather(store)
setupGitHub(store)
const launcher = setupLauncher({ store, links, notes, settings })
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
