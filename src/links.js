import { createId, deriveMark, normalizeLinkUrl, scoreMatch } from './utilities.js'

export function setupLinks(store) {
  const list = document.querySelector('#quick-links-list')
  const addButton = document.querySelector('#add-link')
  const dialog = document.querySelector('#link-dialog')
  const form = document.querySelector('#link-form')
  const heading = document.querySelector('#link-dialog-heading')
  const idInput = document.querySelector('#link-id')
  const labelInput = document.querySelector('#link-label')
  const urlInput = document.querySelector('#link-url')
  const errorMessage = document.querySelector('#link-error')
  const closeButton = document.querySelector('#link-dialog-close')
  const cancelButton = document.querySelector('#link-cancel')
  let draggedLinkId = null

  function closeDialog() {
    dialog.close()
  }

  function openDialog(link = null) {
    form.reset()
    errorMessage.hidden = true
    idInput.value = link?.id || ''
    labelInput.value = link?.label || ''
    urlInput.value = link?.url || ''
    heading.textContent = link ? 'Edit link' : 'Add a link'
    dialog.showModal()
    window.setTimeout(() => labelInput.focus(), 0)
  }

  function makeButton(label, action, linkId) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'link-action'
    button.textContent = label
    button.dataset.action = action
    button.dataset.linkId = linkId
    return button
  }

  function render() {
    const links = store.getState().links
    const items = links.map((link) => {
      const item = document.createElement('li')
      const anchor = document.createElement('a')
      const mark = document.createElement('span')
      const label = document.createElement('span')
      const actions = document.createElement('span')
      const drag = makeButton('↕', 'drag', link.id)

      item.draggable = true
      item.dataset.linkId = link.id
      anchor.href = link.url
      anchor.target = '_blank'
      anchor.rel = 'noreferrer'
      mark.className = 'link-mark'
      mark.textContent = link.mark
      label.textContent = link.label
      actions.className = 'link-actions'
      drag.classList.add('link-drag-handle')
      drag.setAttribute('aria-label', `Move ${link.label}`)
      actions.append(makeButton('edit', 'edit', link.id), makeButton('delete', 'delete', link.id), drag)
      anchor.append(mark, label)
      item.append(anchor, actions)

      item.addEventListener('dragstart', (event) => {
        draggedLinkId = link.id
        item.classList.add('is-dragging')
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', link.id)
      })
      item.addEventListener('dragend', () => {
        draggedLinkId = null
        item.classList.remove('is-dragging')
      })
      item.addEventListener('dragover', (event) => {
        if (draggedLinkId && draggedLinkId !== link.id) event.preventDefault()
      })
      item.addEventListener('drop', (event) => {
        event.preventDefault()
        const sourceId = event.dataTransfer.getData('text/plain')
        if (!sourceId || sourceId === link.id) return
        store.update((data) => {
          const sourceIndex = data.links.findIndex((itemLink) => itemLink.id === sourceId)
          const targetIndex = data.links.findIndex((itemLink) => itemLink.id === link.id)
          if (sourceIndex < 0 || targetIndex < 0) return data
          const [moved] = data.links.splice(sourceIndex, 1)
          data.links.splice(targetIndex, 0, moved)
          return data
        })
      })

      return item
    })
    list.replaceChildren(...items)
  }

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]')
    if (!button) return
    const link = store.getState().links.find((item) => item.id === button.dataset.linkId)
    if (!link) return
    if (button.dataset.action === 'edit') openDialog(link)
    if (button.dataset.action === 'delete') {
      if (!window.confirm(`Delete ${link.label} from the jump list?`)) return
      store.update((data) => {
        data.links = data.links.filter((item) => item.id !== link.id)
        return data
      })
    }
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      const label = labelInput.value.trim()
      const url = normalizeLinkUrl(urlInput.value)
      if (!label) throw new Error('Add a label for this link.')
      store.update((data) => {
        const id = idInput.value || createId('link')
        const nextLink = { id, label, url, mark: deriveMark(label) }
        const index = data.links.findIndex((link) => link.id === id)
        if (index >= 0) data.links[index] = nextLink
        else data.links.push(nextLink)
        return data
      })
      closeDialog()
    } catch (error) {
      errorMessage.textContent = error.message
      errorMessage.hidden = false
    }
  })

  addButton.addEventListener('click', () => openDialog())
  closeButton.addEventListener('click', closeDialog)
  cancelButton.addEventListener('click', closeDialog)
  store.subscribe(render)
  render()

  return {
    openByName(name) {
      const matches = store
        .getState()
        .links.map((link) => ({ link, score: scoreMatch(name, `${link.label} ${link.url}`) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
      if (!matches[0]) return false
      window.location.assign(matches[0].link.url)
      return true
    },
  }
}
