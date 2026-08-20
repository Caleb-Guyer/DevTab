import { createDefaultWorkspace } from './config.js'
import { getActiveWorkspace } from './state.js'
import { createId, scoreMatch } from './utilities.js'

function suggestedCommand(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'workspace'
  )
}

function derivedIcon(name) {
  const parts = name.match(/[A-Z]+(?=[A-Z][a-z]|\b)|[A-Z]?[a-z]+|\d+/g) || [name]
  return (parts.length > 1 ? parts.map((part) => part[0]).join('') : parts[0].slice(0, 2))
    .slice(0, 3)
    .toUpperCase() || 'WS'
}

export function setupWorkspaces(store) {
  const select = document.querySelector('#workspace-select')
  const manageButton = document.querySelector('#workspace-manage')
  const eyebrow = document.querySelector('#workspace-eyebrow')
  const description = document.querySelector('#workspace-description')
  const dialog = document.querySelector('#workspace-dialog')
  const form = document.querySelector('#workspace-form')
  const heading = document.querySelector('#workspace-dialog-heading')
  const idInput = document.querySelector('#workspace-id')
  const nameInput = document.querySelector('#workspace-name')
  const commandInput = document.querySelector('#workspace-command')
  const iconInput = document.querySelector('#workspace-icon')
  const descriptionInput = document.querySelector('#workspace-dialog-description')
  const accentInput = document.querySelector('#workspace-accent')
  const repositoryInput = document.querySelector('#workspace-repository')
  const error = document.querySelector('#workspace-error')
  const closeButton = document.querySelector('#workspace-dialog-close')
  const cancelButton = document.querySelector('#workspace-cancel')
  const newButton = document.querySelector('#workspace-new')
  const duplicateButton = document.querySelector('#workspace-duplicate')
  const deleteButton = document.querySelector('#workspace-delete')
  let commandWasEdited = false

  function switchTo(workspaceId) {
    if (workspaceId === store.getState().activeWorkspaceId) return true
    if (!store.getState().workspaces.some((workspace) => workspace.id === workspaceId)) return false
    store.update(
      (data) => {
        data.activeWorkspaceId = workspaceId
        return data
      },
      { source: 'workspaces', action: 'switch' },
    )
    return true
  }

  function render() {
    const state = store.getState()
    const workspace = getActiveWorkspace(state)
    const previousValue = select.value
    const options = state.workspaces.map((item, index) => {
      const option = document.createElement('option')
      option.value = item.id
      option.textContent = `${index + 1} · ${item.icon} / ${item.name}`
      return option
    })
    select.replaceChildren(...options)
    select.value = workspace.id || previousValue
    eyebrow.textContent = `${workspace.icon} / ${workspace.name}`
    description.textContent = workspace.description
    document.title = `${workspace.name} — DevTab`
  }

  function fillForm(workspace) {
    idInput.value = workspace?.id || ''
    nameInput.value = workspace?.name || ''
    commandInput.value = workspace?.command || ''
    iconInput.value = workspace?.icon || ''
    descriptionInput.value = workspace?.description || ''
    accentInput.value = workspace?.accent || getActiveWorkspace(store.getState()).accent
    repositoryInput.value = workspace?.repository || ''
    commandWasEdited = Boolean(workspace)
    error.hidden = true
    const isExisting = Boolean(workspace)
    heading.textContent = isExisting ? `Edit ${workspace.name}` : 'New workspace'
    duplicateButton.hidden = !isExisting
    deleteButton.hidden = !isExisting || store.getState().workspaces.length <= 1
  }

  function openManager(mode = 'edit') {
    fillForm(mode === 'new' ? null : getActiveWorkspace(store.getState()))
    if (!dialog.open) dialog.showModal()
    window.setTimeout(() => nameInput.focus(), 0)
  }

  function close() {
    dialog.close()
  }

  function uniqueCommand(command, ignoredId = '') {
    return !store
      .getState()
      .workspaces.some((workspace) => workspace.id !== ignoredId && workspace.command === command)
  }

  function duplicateWorkspace() {
    const source = getActiveWorkspace(store.getState())
    const copy = structuredClone(source)
    copy.id = createId('workspace')
    copy.name = `${source.name} Copy`
    copy.command = `${source.command}-copy`
    copy.notes.forEach((note) => {
      const oldId = note.id
      note.id = createId('note')
      if (copy.activeNoteId === oldId) copy.activeNoteId = note.id
    })
    copy.tasks.forEach((task) => {
      const oldId = task.id
      task.id = createId('task')
      if (copy.focus.linkedTaskId === oldId) copy.focus.linkedTaskId = task.id
    })
    copy.tabSession.tabs.forEach((tab) => {
      tab.id = createId('tab')
    })
    copy.focus.status = 'idle'
    copy.focus.endsAt = null
    copy.createdAt = new Date().toISOString()
    copy.updatedAt = copy.createdAt
    store.update(
      (data) => {
        data.workspaces.push(copy)
        data.activeWorkspaceId = copy.id
        return data
      },
      { source: 'workspaces', action: 'duplicate' },
    )
    close()
  }

  select.addEventListener('change', () => switchTo(select.value))
  manageButton.addEventListener('click', () => openManager())
  closeButton.addEventListener('click', close)
  cancelButton.addEventListener('click', close)
  newButton.addEventListener('click', () => fillForm(null))
  duplicateButton.addEventListener('click', duplicateWorkspace)

  nameInput.addEventListener('input', () => {
    if (!commandWasEdited) commandInput.value = suggestedCommand(nameInput.value)
    if (!iconInput.value.trim()) iconInput.placeholder = derivedIcon(nameInput.value)
  })
  commandInput.addEventListener('input', () => {
    commandWasEdited = true
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const name = nameInput.value.trim()
    const command = suggestedCommand(commandInput.value || name)
    if (!name) {
      error.textContent = 'Give this workspace a name.'
      error.hidden = false
      return
    }
    if (!uniqueCommand(command, idInput.value)) {
      error.textContent = `The command “${command}” is already used by another workspace.`
      error.hidden = false
      return
    }

    store.update(
      (data) => {
        let workspace = data.workspaces.find((item) => item.id === idInput.value)
        if (!workspace) {
          workspace = createDefaultWorkspace({ id: createId('workspace'), name })
          data.workspaces.push(workspace)
          data.activeWorkspaceId = workspace.id
        }
        workspace.name = name
        workspace.command = command
        workspace.icon = (iconInput.value.trim() || derivedIcon(name)).slice(0, 3).toUpperCase()
        workspace.description = descriptionInput.value.trim() || 'Pick up exactly where you left off.'
        workspace.accent = accentInput.value
        workspace.repository = repositoryInput.value.trim()
        workspace.updatedAt = new Date().toISOString()
        return data
      },
      { source: 'workspaces', action: 'save' },
    )
    close()
  })

  deleteButton.addEventListener('click', () => {
    const workspace = getActiveWorkspace(store.getState())
    if (store.getState().workspaces.length <= 1) return
    if (!window.confirm(`Delete “${workspace.name}” and its local notes, tasks, links, and session?`)) {
      return
    }
    store.update(
      (data) => {
        data.workspaces = data.workspaces.filter((item) => item.id !== workspace.id)
        data.activeWorkspaceId = data.workspaces[0].id
        return data
      },
      { source: 'workspaces', action: 'delete' },
    )
    close()
  })

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close()
  })
  store.subscribe(render)
  render()

  return {
    openManager,
    switchTo,
    switchByIndex(index) {
      const workspace = store.getState().workspaces[index]
      return workspace ? switchTo(workspace.id) : false
    },
    switchByName(query) {
      const match = store
        .getState()
        .workspaces.map((workspace) => ({
          workspace,
          score: scoreMatch(query, `${workspace.name} ${workspace.command} ${workspace.repository}`),
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)[0]
      return match ? switchTo(match.workspace.id) : false
    },
  }
}
