import { parseMarkdownLines, toggleChecklistLine } from './markdown.js'
import { createDefaultNote } from './config.js'
import { createId, formatRelativeTime } from './utilities.js'

const SAVE_DELAY = 250

export function setupNotes(store) {
  const titleInput = document.querySelector('#note-title')
  const contentInput = document.querySelector('#quick-note')
  const searchInput = document.querySelector('#note-search')
  const list = document.querySelector('#note-list')
  const preview = document.querySelector('#markdown-preview')
  const status = document.querySelector('#note-status')
  const meta = document.querySelector('#note-meta')
  const addButton = document.querySelector('#add-note')
  const pinButton = document.querySelector('#pin-note')
  const downloadButton = document.querySelector('#download-note')
  const deleteButton = document.querySelector('#delete-note')
  let saveTimer

  function activeNote() {
    const state = store.getState()
    return state.notes.find((note) => note.id === state.activeNoteId) || state.notes[0]
  }

  function setStatus(message, state = 'saved') {
    status.textContent = message
    status.dataset.state = state
  }

  function setActive(noteId) {
    store.update(
      (data) => {
        if (data.notes.some((note) => note.id === noteId)) data.activeNoteId = noteId
        return data
      },
      { source: 'notes', action: 'select' },
    )
  }

  function renderList() {
    const query = searchInput.value.trim().toLowerCase()
    const notes = [...store.getState().notes]
      .filter(
        (note) =>
          !query || `${note.title} ${note.content}`.toLowerCase().includes(query),
      )
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))

    if (notes.length === 0) {
      const item = document.createElement('li')
      item.className = 'note-list-empty'
      item.textContent = 'No matching notes.'
      list.replaceChildren(item)
      return
    }

    const items = notes.map((note) => {
      const item = document.createElement('li')
      const button = document.createElement('button')
      const title = document.createElement('span')
      const detail = document.createElement('span')
      button.type = 'button'
      button.className = 'note-list-button'
      button.dataset.active = String(note.id === store.getState().activeNoteId)
      button.addEventListener('click', () => setActive(note.id))
      title.className = 'note-list-title'
      title.textContent = `${note.pinned ? '◆ ' : ''}${note.title}`
      detail.className = 'note-list-detail'
      detail.textContent = `${formatRelativeTime(note.updatedAt)} · ${note.content.length} chars`
      button.append(title, detail)
      item.append(button)
      return item
    })
    list.replaceChildren(...items)
  }

  function renderPreview() {
    const note = activeNote()
    const tokens = parseMarkdownLines(note.content)
    if (tokens.every((token) => token.type === 'blank')) {
      const empty = document.createElement('p')
      empty.className = 'preview-empty'
      empty.textContent = 'Markdown preview appears here.'
      preview.replaceChildren(empty)
      return
    }

    const elements = tokens.map((token) => {
      if (token.type === 'heading') {
        const heading = document.createElement(`h${Math.min(token.level + 2, 6)}`)
        heading.textContent = token.text
        return heading
      }
      if (token.type === 'checklist') {
        const label = document.createElement('label')
        const checkbox = document.createElement('input')
        const text = document.createElement('span')
        label.className = 'preview-checklist'
        checkbox.type = 'checkbox'
        checkbox.checked = token.checked
        checkbox.addEventListener('change', () => {
          const current = activeNote()
          const content = toggleChecklistLine(current.content, token.lineIndex, checkbox.checked)
          contentInput.value = content
          updateActive({ content }, true)
        })
        text.textContent = token.text
        label.append(checkbox, text)
        return label
      }
      if (token.type === 'bullet') {
        const item = document.createElement('p')
        item.className = 'preview-bullet'
        item.textContent = token.text
        return item
      }
      if (token.type === 'code') {
        const code = document.createElement('code')
        code.textContent = token.text || ' '
        return code
      }
      const paragraph = document.createElement('p')
      paragraph.textContent = token.text || ' '
      if (token.type === 'blank') paragraph.className = 'preview-blank'
      return paragraph
    })
    preview.replaceChildren(...elements)
  }

  function renderEditor() {
    const note = activeNote()
    titleInput.value = note.title
    contentInput.value = note.content
    meta.textContent = `Created ${formatRelativeTime(note.createdAt)} · Updated ${formatRelativeTime(note.updatedAt)}`
    pinButton.textContent = note.pinned ? 'Unpin' : 'Pin'
    renderList()
    renderPreview()
  }

  function updateActive(changes, immediate = false) {
    window.clearTimeout(saveTimer)
    const save = () => {
      saveTimer = undefined
      const now = new Date().toISOString()
      const persisted = store.update(
        (data) => {
          const note = data.notes.find((item) => item.id === data.activeNoteId)
          if (!note) return data
          Object.assign(note, changes, { updatedAt: now })
          return data
        },
        { source: 'notes', action: 'save' },
      )
      setStatus(persisted ? 'Saved' : 'Not saved', persisted ? 'saved' : 'error')
      renderList()
      renderPreview()
      meta.textContent = `Updated ${formatRelativeTime(now)}`
      pinButton.textContent = activeNote().pinned ? 'Unpin' : 'Pin'
    }
    if (immediate) save()
    else {
      setStatus('Saving…', 'saving')
      saveTimer = window.setTimeout(save, SAVE_DELAY)
    }
  }

  function createNote(content = '') {
    const note = createDefaultNote(content)
    note.id = createId('note')
    note.title = content ? 'Quick note' : 'Untitled note'
    note.pinned = false
    store.update(
      (data) => {
        data.notes.push(note)
        data.activeNoteId = note.id
        return data
      },
      { source: 'notes', action: 'create' },
    )
    titleInput.focus()
    titleInput.select()
    return note
  }

  function downloadNote() {
    const note = activeNote()
    const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: 'text/markdown' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'note'}.md`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  titleInput.addEventListener('input', () => updateActive({ title: titleInput.value || 'Untitled note' }))
  contentInput.addEventListener('input', () => updateActive({ content: contentInput.value }))
  searchInput.addEventListener('input', renderList)
  addButton.addEventListener('click', () => createNote())
  pinButton.addEventListener('click', () => updateActive({ pinned: !activeNote().pinned }, true))
  downloadButton.addEventListener('click', downloadNote)
  deleteButton.addEventListener('click', () => {
    const note = activeNote()
    if (!window.confirm(`Delete “${note.title}”?`)) return
    store.update(
      (data) => {
        data.notes = data.notes.filter((item) => item.id !== note.id)
        if (data.notes.length === 0) data.notes.push(createDefaultNote())
        data.activeNoteId = data.notes[0].id
        return data
      },
      { source: 'notes', action: 'delete' },
    )
  })

  store.subscribe((_state, metaInfo) => {
    if (metaInfo.source === 'notes' && metaInfo.action === 'save') return
    renderEditor()
  })
  window.addEventListener('pagehide', () => {
    if (saveTimer !== undefined) {
      updateActive({ title: titleInput.value, content: contentInput.value }, true)
    }
  })
  renderEditor()

  return {
    focus() {
      contentInput.focus()
    },
    createNote,
    append(text) {
      const state = store.getState()
      const target = state.notes.find((note) => note.pinned) || activeNote()
      store.update(
        (data) => {
          const note = data.notes.find((item) => item.id === target.id)
          note.content = `${note.content}${note.content ? '\n' : ''}${text}`
          note.updatedAt = new Date().toISOString()
          data.activeNoteId = note.id
          return data
        },
        { source: 'notes', action: 'append' },
      )
    },
  }
}
