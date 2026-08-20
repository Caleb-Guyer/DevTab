import { getActiveWorkspace } from './state.js'

function remainingSeconds(focus) {
  if (focus.status !== 'running' || !focus.endsAt) return focus.remainingSeconds
  return Math.max(0, Math.ceil((focus.endsAt - Date.now()) / 1000))
}

function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export function setupFocus(store) {
  const time = document.querySelector('#focus-time')
  const status = document.querySelector('#focus-status')
  const progress = document.querySelector('#focus-progress')
  const taskSelect = document.querySelector('#focus-task')
  const toggleButton = document.querySelector('#focus-toggle')
  const resetButton = document.querySelector('#focus-reset')
  const sessions = document.querySelector('#focus-sessions')
  const presetButtons = [...document.querySelectorAll('[data-focus-minutes]')]
  let lastWorkspaceId = ''

  function completeExpiredTimer() {
    const state = store.getState()
    const workspace = getActiveWorkspace(state)
    const focus = workspace.focus
    if (focus.status !== 'running' || remainingSeconds(focus) > 0) return false
    store.update(
      (data) => {
        const active = getActiveWorkspace(data)
        if (active.id !== workspace.id || active.focus.status !== 'running') return data
        active.focus.status = 'idle'
        active.focus.endsAt = null
        active.focus.remainingSeconds = active.focus.durationMinutes * 60
        active.focus.sessionsCompleted += 1
        active.updatedAt = new Date().toISOString()
        return data
      },
      { source: 'focus', action: 'complete' },
    )
    status.textContent = 'Focus block complete. Take a deliberate break.'
    status.dataset.auto = 'false'
    return true
  }

  function renderTaskOptions(workspace) {
    const signature = `${workspace.id}:${workspace.tasks.map((task) => `${task.id}:${task.title}:${task.completed}`).join('|')}`
    if (taskSelect.dataset.signature === signature) return
    taskSelect.dataset.signature = signature
    const none = document.createElement('option')
    none.value = ''
    none.textContent = 'No linked task'
    const tasks = workspace.tasks
      .filter((task) => !task.completed)
      .map((task) => {
        const option = document.createElement('option')
        option.value = task.id
        option.textContent = task.title
        return option
      })
    taskSelect.replaceChildren(none, ...tasks)
    taskSelect.value = workspace.focus.linkedTaskId
  }

  function render() {
    if (completeExpiredTimer()) return
    const workspace = getActiveWorkspace(store.getState())
    const focus = workspace.focus
    const remaining = remainingSeconds(focus)
    const total = focus.durationMinutes * 60
    time.textContent = formatTimer(remaining)
    time.dateTime = `PT${remaining}S`
    progress.max = total
    progress.value = total - remaining
    toggleButton.textContent = focus.status === 'running' ? 'Pause' : focus.status === 'paused' ? 'Resume' : 'Start focus'
    sessions.textContent = `${focus.sessionsCompleted} ${focus.sessionsCompleted === 1 ? 'session' : 'sessions'} completed`
    if (lastWorkspaceId !== workspace.id || status.dataset.auto === 'true') {
      status.dataset.auto = 'true'
      status.textContent =
        focus.status === 'running'
          ? `Focusing in ${workspace.name}`
          : focus.status === 'paused'
            ? 'Timer paused; the remaining time is saved.'
            : 'Choose a task, set a duration, and protect the block.'
    }
    lastWorkspaceId = workspace.id
    renderTaskOptions(workspace)
    presetButtons.forEach((button) => {
      button.dataset.active = String(Number(button.dataset.focusMinutes) === focus.durationMinutes)
    })
  }

  function setDuration(minutes) {
    status.dataset.auto = 'true'
    store.update(
      (data) => {
        const workspace = getActiveWorkspace(data)
        workspace.focus.durationMinutes = minutes
        workspace.focus.remainingSeconds = minutes * 60
        workspace.focus.status = 'idle'
        workspace.focus.endsAt = null
        return data
      },
      { source: 'focus', action: 'duration' },
    )
  }

  function toggle() {
    status.dataset.auto = 'true'
    store.update(
      (data) => {
        const focus = getActiveWorkspace(data).focus
        if (focus.status === 'running') {
          focus.remainingSeconds = remainingSeconds(focus)
          focus.status = 'paused'
          focus.endsAt = null
        } else {
          if (focus.remainingSeconds <= 0) focus.remainingSeconds = focus.durationMinutes * 60
          focus.status = 'running'
          focus.endsAt = Date.now() + focus.remainingSeconds * 1000
        }
        return data
      },
      { source: 'focus', action: 'toggle' },
    )
  }

  function reset() {
    status.dataset.auto = 'true'
    store.update(
      (data) => {
        const focus = getActiveWorkspace(data).focus
        focus.status = 'idle'
        focus.endsAt = null
        focus.remainingSeconds = focus.durationMinutes * 60
        return data
      },
      { source: 'focus', action: 'reset' },
    )
  }

  toggleButton.addEventListener('click', toggle)
  resetButton.addEventListener('click', reset)
  presetButtons.forEach((button) => {
    button.addEventListener('click', () => setDuration(Number(button.dataset.focusMinutes)))
  })
  taskSelect.addEventListener('change', () => {
    store.update(
      (data) => {
        getActiveWorkspace(data).focus.linkedTaskId = taskSelect.value
        return data
      },
      { source: 'focus', action: 'link-task' },
    )
  })
  store.subscribe(render)
  window.setInterval(render, 500)
  render()

  return { toggle, reset, setDuration }
}
