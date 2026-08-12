import './style.css'

const NOTE_STORAGE_KEY = 'devtab.quick-note'
const NOTE_SAVE_DELAY = 300

const clock = document.querySelector('#clock')
const clockTime = document.querySelector('#clock-time')
const clockDate = document.querySelector('#clock-date')

const timeFormatter = new Intl.DateTimeFormat([], {
  hour: 'numeric',
  minute: '2-digit',
})

const dateFormatter = new Intl.DateTimeFormat([], {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

function updateClock() {
  const now = new Date()

  clock.dateTime = now.toISOString()
  clockTime.textContent = timeFormatter.format(now)
  clockDate.textContent = dateFormatter.format(now)
}

updateClock()
window.setInterval(updateClock, 1000)

function setupNotesWidget() {
  const noteInput = document.querySelector('#quick-note')
  const clearButton = document.querySelector('#clear-note')
  const saveStatus = document.querySelector('#note-status')
  let saveTimer

  function setSaveStatus(message, state) {
    saveStatus.textContent = message
    saveStatus.dataset.state = state
  }

  function updateClearButton() {
    clearButton.disabled = noteInput.value.length === 0
  }

  function handleStorageError(action, error) {
    console.warn(`DevTab could not ${action} the note.`, error)
    setSaveStatus('Not saved', 'error')
    saveStatus.title = 'Browser storage is unavailable. Your note will remain editable.'
  }

  function saveNote() {
    window.clearTimeout(saveTimer)
    saveTimer = undefined

    try {
      if (noteInput.value) {
        window.localStorage.setItem(NOTE_STORAGE_KEY, noteInput.value)
      } else {
        window.localStorage.removeItem(NOTE_STORAGE_KEY)
      }

      saveStatus.removeAttribute('title')
      setSaveStatus('Saved', 'saved')
    } catch (error) {
      handleStorageError('save', error)
    }

    updateClearButton()
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer)
    setSaveStatus('Saving…', 'saving')
    saveTimer = window.setTimeout(saveNote, NOTE_SAVE_DELAY)
    updateClearButton()
  }

  function loadNote() {
    try {
      const savedNote = window.localStorage.getItem(NOTE_STORAGE_KEY)

      if (savedNote !== null) {
        noteInput.value = savedNote
      }

      setSaveStatus('Saved', 'saved')
    } catch (error) {
      handleStorageError('load', error)
    }

    updateClearButton()
  }

  noteInput.addEventListener('input', scheduleSave)

  clearButton.addEventListener('click', () => {
    noteInput.value = ''
    saveNote()
    noteInput.focus()
  })

  window.addEventListener('pagehide', () => {
    if (saveTimer !== undefined) {
      saveNote()
    }
  })

  loadNote()
}

setupNotesWidget()
