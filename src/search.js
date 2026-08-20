import { buildSearchDestination } from './utilities.js'

export function setupSearch(store, launcher) {
  const form = document.querySelector('#search-form')
  const input = document.querySelector('#web-search')
  const engine = document.querySelector('#search-engine')

  function sync(settings) {
    engine.value = settings.searchEngine
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const query = input.value.trim()
    if (!query) return
    if (query.startsWith('>')) {
      launcher.open(query)
      input.value = ''
      return
    }
    window.location.assign(buildSearchDestination(query, engine.value))
  })

  input.addEventListener('input', () => {
    if (input.value === '>') {
      launcher.open('>')
      input.value = ''
    }
  })

  engine.addEventListener('change', () => {
    store.update((data) => {
      data.settings.searchEngine = engine.value
      return data
    })
  })

  store.subscribe((state) => sync(state.settings))
  sync(store.getState().settings)

  return { focus: () => input.focus() }
}
