import {
  buildSearchDestination,
  calculateExpression,
  parseCommandInput,
  scoreMatch,
} from './utilities.js'
import { getActiveWorkspace } from './state.js'

export function setupLauncher({ store, links, notes, settings, workspaces, tasks, sessions, focus }) {
  const dialog = document.querySelector('#command-dialog')
  const trigger = document.querySelector('#command-trigger')
  const closeButton = document.querySelector('#command-close')
  const input = document.querySelector('#command-input')
  const feedback = document.querySelector('#command-feedback')
  const results = document.querySelector('#command-results')
  let selectedIndex = 0
  let visibleActions = []

  function close() {
    dialog.close()
  }

  function navigate(url) {
    close()
    window.location.assign(url)
  }

  function staticActions() {
    return [
      {
        label: 'Switch workspace',
        detail: 'workspace <name>',
        keywords: 'project context change workspace',
        run: () => {
          input.value = 'workspace '
          input.focus()
          render()
        },
      },
      {
        label: 'Launch workspace tabs',
        detail: 'launch <name>',
        keywords: 'restore tabs browser session project',
        run: () => {
          input.value = 'launch '
          input.focus()
          render()
        },
      },
      {
        label: 'Add a project task',
        detail: 'task <text>',
        keywords: 'todo project queue add',
        run: () => {
          input.value = 'task '
          input.focus()
          render()
        },
      },
      {
        label: 'Start a focus block',
        detail: 'focus 25',
        keywords: 'timer pomodoro concentrate work',
        run: () => {
          input.value = 'focus 25'
          input.focus()
          render()
        },
      },
      {
        label: 'Search GitHub',
        detail: 'gh <query>',
        keywords: 'github code repository search',
        run: () => {
          input.value = 'gh '
          input.focus()
          render()
        },
      },
      {
        label: 'Search MDN',
        detail: 'mdn <query>',
        keywords: 'documentation web javascript css html',
        run: () => {
          input.value = 'mdn '
          input.focus()
          render()
        },
      },
      {
        label: 'Add a note',
        detail: 'note <text>',
        keywords: 'scratch reminder write',
        run: () => {
          input.value = 'note '
          input.focus()
          render()
        },
      },
      {
        label: 'Calculate',
        detail: 'calc <expression>',
        keywords: 'math calculator arithmetic',
        run: () => {
          input.value = 'calc '
          input.focus()
          render()
        },
      },
      {
        label: 'Toggle theme',
        detail: 'theme dark|light|mint…',
        keywords: 'appearance color mode',
        run: () => {
          settings.toggleTheme()
          close()
        },
      },
      ...store.getState().workspaces.map((workspace) => ({
        label: `Switch to ${workspace.name}`,
        detail: `workspace ${workspace.command}`,
        keywords: `project context ${workspace.name} ${workspace.repository}`,
        run: () => {
          workspaces.switchTo(workspace.id)
          close()
        },
      })),
      ...getActiveWorkspace(store.getState()).links.map((link) => ({
        label: `Open ${link.label}`,
        detail: link.url,
        keywords: `open ${link.label} ${link.url}`,
        run: () => navigate(link.url),
      })),
    ]
  }

  function dynamicAction(value) {
    const { name, args } = parseCommandInput(value)
    if (!name || !args) return null

    if (name === 'workspace') {
      return {
        label: `Switch to workspace “${args}”`,
        detail: 'change the active project context',
        run: () => {
          if (workspaces.switchByName(args)) close()
          else feedback.textContent = `No workspace matches “${args}”.`
        },
      }
    }
    if (name === 'launch') {
      return {
        label: `Launch workspace “${args}”`,
        detail: 'switch context and restore its saved tabs',
        run: async () => {
          if (!workspaces.switchByName(args)) {
            feedback.textContent = `No workspace matches “${args}”.`
            return
          }
          close()
          await sessions.restore()
        },
      }
    }
    if (name === 'task') {
      return {
        label: `Add task “${args}”`,
        detail: `save to ${getActiveWorkspace(store.getState()).name}`,
        run: () => {
          tasks.add(args)
          feedback.textContent = 'Task added to this workspace.'
          window.setTimeout(close, 350)
        },
      }
    }
    if (name === 'done') {
      return {
        label: `Complete task “${args}”`,
        detail: 'match an open workspace task',
        run: () => {
          if (tasks.completeByName(args)) close()
          else feedback.textContent = `No open task matches “${args}”.`
        },
      }
    }
    if (name === 'focus') {
      const minutes = Number(args)
      const isDuration = Number.isInteger(minutes) && minutes >= 5 && minutes <= 120
      const action = args.toLowerCase()
      return {
        label: isDuration ? `Start a ${minutes}-minute focus block` : `${action} focus timer`,
        detail: isDuration ? '5–120 minutes' : 'start, pause, or reset',
        disabled: !isDuration && !['start', 'pause', 'reset'].includes(action),
        run: () => {
          if (isDuration) {
            focus.setDuration(minutes)
            focus.toggle()
          } else if (action === 'reset') focus.reset()
          else focus.toggle()
          close()
        },
      }
    }

    if (name === 'gh') {
      return { label: `Search GitHub for “${args}”`, detail: 'github.com/search', run: () => navigate(buildSearchDestination(args, 'github')) }
    }
    if (name === 'mdn') {
      return { label: `Search MDN for “${args}”`, detail: 'developer.mozilla.org', run: () => navigate(buildSearchDestination(args, 'mdn')) }
    }
    if (name === 'open') {
      return {
        label: `Open “${args}”`,
        detail: 'match a saved jump-list link',
        run: () => {
          if (links.openByName(args)) close()
          else feedback.textContent = `No saved link matches “${args}”.`
        },
      }
    }
    if (name === 'note') {
      return {
        label: `Append “${args}” to a note`,
        detail: 'saved locally',
        run: () => {
          notes.append(args)
          feedback.textContent = 'Added to your pinned note.'
          window.setTimeout(close, 350)
        },
      }
    }
    if (name === 'theme') {
      return {
        label: `Set appearance to “${args}”`,
        detail: 'dark, light, system, mint, violet, amber, or azure',
        run: () => {
          if (settings.setAppearance(args)) {
            feedback.textContent = `Appearance set to ${args}.`
            window.setTimeout(close, 350)
          } else feedback.textContent = `“${args}” is not an available theme or accent.`
        },
      }
    }
    if (name === 'calc') {
      try {
        const valueResult = calculateExpression(args)
        return {
          label: `${args} = ${valueResult}`,
          detail: 'copy result',
          run: async () => {
            try {
              await navigator.clipboard.writeText(String(valueResult))
              feedback.textContent = 'Result copied.'
            } catch {
              feedback.textContent = `Result: ${valueResult}`
            }
          },
        }
      } catch (error) {
        return { label: error.message, detail: 'check the expression', disabled: true, run() {} }
      }
    }
    return null
  }

  function render() {
    const query = input.value.trim().replace(/^>/, '').trim()
    const direct = dynamicAction(query)
    if (direct) visibleActions = [direct]
    else {
      visibleActions = staticActions()
        .map((action) => ({
          ...action,
          score: scoreMatch(query, `${action.label} ${action.detail} ${action.keywords}`),
        }))
        .filter((action) => action.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
    }
    selectedIndex = Math.min(selectedIndex, Math.max(0, visibleActions.length - 1))
    const items = visibleActions.map((action, index) => {
      const item = document.createElement('li')
      const button = document.createElement('button')
      const label = document.createElement('span')
      const detail = document.createElement('span')
      button.type = 'button'
      button.role = 'option'
      button.disabled = action.disabled
      button.setAttribute('aria-selected', String(index === selectedIndex))
      label.className = 'command-result-label'
      label.textContent = action.label
      detail.className = 'command-result-detail'
      detail.textContent = action.detail
      button.append(label, detail)
      button.addEventListener('mouseenter', () => {
        selectedIndex = index
        renderSelection()
      })
      button.addEventListener('click', action.run)
      item.append(button)
      return item
    })
    results.replaceChildren(...items)
    feedback.textContent = visibleActions.length ? 'Enter to run · arrows to move · Esc to close' : 'No matching commands.'
  }

  function renderSelection() {
    results.querySelectorAll('button').forEach((button, index) => {
      button.setAttribute('aria-selected', String(index === selectedIndex))
    })
    results.querySelectorAll('button')[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }

  function open(value = '') {
    input.value = value.replace(/^>\s?/, '')
    selectedIndex = 0
    render()
    if (!dialog.open) dialog.showModal()
    window.setTimeout(() => input.focus(), 0)
  }

  input.addEventListener('input', () => {
    selectedIndex = 0
    render()
  })
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (visibleActions.length === 0) return
      const direction = event.key === 'ArrowDown' ? 1 : -1
      selectedIndex = (selectedIndex + direction + visibleActions.length) % visibleActions.length
      renderSelection()
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (!visibleActions[selectedIndex]?.disabled) visibleActions[selectedIndex]?.run()
    }
  })
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close()
  })
  trigger.addEventListener('click', () => open())
  closeButton.addEventListener('click', close)
  store.subscribe(() => {
    if (dialog.open) render()
  })

  return { open, close }
}
