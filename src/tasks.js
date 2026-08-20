import { getActiveWorkspace } from './state.js'
import { createId, formatRelativeTime, scoreMatch } from './utilities.js'

export function setupTasks(store) {
  const form = document.querySelector('#task-form')
  const input = document.querySelector('#task-input')
  const list = document.querySelector('#task-list')
  const filter = document.querySelector('#task-filter')
  const clearButton = document.querySelector('#clear-completed-tasks')
  const progress = document.querySelector('#task-progress')
  const summary = document.querySelector('#task-progress-summary')

  function add(title) {
    const normalized = title.trim()
    if (!normalized) return false
    const now = new Date().toISOString()
    store.update(
      (data) => {
        const workspace = getActiveWorkspace(data)
        workspace.tasks.unshift({
          id: createId('task'),
          title: normalized,
          completed: false,
          createdAt: now,
          completedAt: null,
        })
        workspace.updatedAt = now
        return data
      },
      { source: 'tasks', action: 'add' },
    )
    return true
  }

  function toggle(taskId) {
    store.update(
      (data) => {
        const workspace = getActiveWorkspace(data)
        const task = workspace.tasks.find((item) => item.id === taskId)
        if (!task) return data
        task.completed = !task.completed
        task.completedAt = task.completed ? new Date().toISOString() : null
        workspace.updatedAt = new Date().toISOString()
        return data
      },
      { source: 'tasks', action: 'toggle' },
    )
  }

  function remove(taskId) {
    store.update(
      (data) => {
        const workspace = getActiveWorkspace(data)
        workspace.tasks = workspace.tasks.filter((task) => task.id !== taskId)
        if (workspace.focus.linkedTaskId === taskId) workspace.focus.linkedTaskId = ''
        workspace.updatedAt = new Date().toISOString()
        return data
      },
      { source: 'tasks', action: 'delete' },
    )
  }

  function render() {
    const workspace = getActiveWorkspace(store.getState())
    const completed = workspace.tasks.filter((task) => task.completed).length
    const total = workspace.tasks.length
    const percentage = total ? Math.round((completed / total) * 100) : 0
    progress.max = Math.max(total, 1)
    progress.value = completed
    summary.textContent = total
      ? `${completed} of ${total} complete · ${percentage}%`
      : 'No tasks yet · add the next concrete step'
    clearButton.disabled = completed === 0

    const visible = workspace.tasks.filter((task) => {
      if (filter.value === 'open') return !task.completed
      if (filter.value === 'done') return task.completed
      return true
    })

    if (visible.length === 0) {
      const item = document.createElement('li')
      item.className = 'task-empty'
      item.textContent = total ? 'No tasks match this view.' : 'Your project queue is clear.'
      list.replaceChildren(item)
      return
    }

    list.replaceChildren(
      ...visible.map((task) => {
        const item = document.createElement('li')
        const label = document.createElement('label')
        const checkbox = document.createElement('input')
        const copy = document.createElement('span')
        const title = document.createElement('span')
        const meta = document.createElement('span')
        const removeButton = document.createElement('button')
        item.className = 'task-item'
        item.dataset.completed = String(task.completed)
        checkbox.type = 'checkbox'
        checkbox.checked = task.completed
        checkbox.addEventListener('change', () => toggle(task.id))
        copy.className = 'task-copy'
        title.className = 'task-title'
        title.textContent = task.title
        meta.className = 'task-meta'
        meta.textContent = task.completed
          ? `Completed ${formatRelativeTime(task.completedAt)}`
          : `Added ${formatRelativeTime(task.createdAt)}`
        removeButton.type = 'button'
        removeButton.className = 'task-remove'
        removeButton.textContent = '×'
        removeButton.setAttribute('aria-label', `Delete ${task.title}`)
        removeButton.addEventListener('click', () => remove(task.id))
        copy.append(title, meta)
        label.append(checkbox, copy)
        item.append(label, removeButton)
        return item
      }),
    )
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (add(input.value)) {
      input.value = ''
      input.focus()
    }
  })
  filter.addEventListener('change', render)
  clearButton.addEventListener('click', () => {
    store.update(
      (data) => {
        const workspace = getActiveWorkspace(data)
        const removedIds = new Set(
          workspace.tasks.filter((task) => task.completed).map((task) => task.id),
        )
        workspace.tasks = workspace.tasks.filter((task) => !task.completed)
        if (removedIds.has(workspace.focus.linkedTaskId)) workspace.focus.linkedTaskId = ''
        return data
      },
      { source: 'tasks', action: 'clear-completed' },
    )
  })
  store.subscribe(render)
  render()

  return {
    add,
    focus() {
      input.focus()
    },
    completeByName(query) {
      const workspace = getActiveWorkspace(store.getState())
      const match = workspace.tasks
        .filter((task) => !task.completed)
        .map((task) => ({ task, score: scoreMatch(query, task.title) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)[0]
      if (!match) return false
      toggle(match.task.id)
      return true
    },
  }
}
