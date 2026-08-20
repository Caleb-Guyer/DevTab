import { getActiveWorkspace, readCache, writeCache } from './state.js'
import { formatRelativeTime } from './utilities.js'

const REQUEST_TIMEOUT = 10000

async function fetchGitHub(path) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    const response = await fetch(`https://api.github.com${path}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!response.ok) {
      if ([403, 429].includes(response.status)) {
        throw new Error('GitHub’s public API limit was reached. Try again later.')
      }
      throw new Error(response.status === 404 ? 'That public repository was not found.' : 'GitHub could not load this project.')
    }
    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The project request timed out.')
    if (error instanceof TypeError) throw new Error('Could not connect to GitHub.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function cacheKey(repository) {
  return `project-${repository.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

export function setupProject({ store, workspaces, sessions }) {
  const card = document.querySelector('.project-card')
  const mark = document.querySelector('#project-mark')
  const name = document.querySelector('#project-name')
  const description = document.querySelector('#project-description')
  const repositoryLink = document.querySelector('#project-repository-link')
  const repositoryName = document.querySelector('#project-repository-name')
  const repositoryStatus = document.querySelector('#project-repository-status')
  const taskStat = document.querySelector('#project-task-stat')
  const focusStat = document.querySelector('#project-focus-stat')
  const tabStat = document.querySelector('#project-tab-stat')
  const stars = document.querySelector('#project-star-stat')
  const issues = document.querySelector('#project-issue-stat')
  const pulls = document.querySelector('#project-pull-stat')
  const release = document.querySelector('#project-release')
  const commits = document.querySelector('#project-commits')
  const editButton = document.querySelector('#project-edit')
  const refreshButton = document.querySelector('#project-refresh')
  const launchButton = document.querySelector('#project-launch')
  let loadedRepository = ''
  let projectData = null
  let requestId = 0

  function renderWorkspace() {
    const workspace = getActiveWorkspace(store.getState())
    const complete = workspace.tasks.filter((task) => task.completed).length
    const percentage = workspace.tasks.length
      ? Math.round((complete / workspace.tasks.length) * 100)
      : 0
    mark.textContent = workspace.icon
    name.textContent = workspace.name
    description.textContent = workspace.description
    taskStat.textContent = workspace.tasks.length ? `${percentage}%` : '—'
    focusStat.textContent = workspace.focus.sessionsCompleted
    tabStat.textContent = workspace.tabSession.tabs.length
    launchButton.disabled = workspace.tabSession.tabs.length === 0
    repositoryName.textContent = workspace.repository || 'No repository connected'
    repositoryLink.hidden = !workspace.repository
    if (workspace.repository) repositoryLink.href = `https://github.com/${workspace.repository}`
    refreshButton.disabled = !workspace.repository
  }

  function renderCommits(items) {
    if (!items?.length) {
      const item = document.createElement('li')
      item.className = 'project-empty'
      item.textContent = 'No public commits available.'
      commits.replaceChildren(item)
      return
    }
    commits.replaceChildren(
      ...items.slice(0, 3).map((commit) => {
        const item = document.createElement('li')
        const link = document.createElement('a')
        const message = document.createElement('span')
        const meta = document.createElement('span')
        link.href = commit.html_url
        link.target = '_blank'
        link.rel = 'noreferrer'
        message.className = 'project-commit-message'
        message.textContent = commit.commit?.message?.split('\n')[0] || 'Commit'
        meta.className = 'project-commit-meta'
        meta.textContent = `${commit.sha.slice(0, 7)} · ${formatRelativeTime(commit.commit?.author?.date)}`
        link.append(message, meta)
        item.append(link)
        return item
      }),
    )
  }

  function display(data, cachedAt = null) {
    projectData = data
    card.dataset.state = cachedAt ? 'cached' : 'ready'
    stars.textContent = new Intl.NumberFormat().format(data.repository.stargazers_count || 0)
    const pullCount = data.pulls?.length || 0
    pulls.textContent = pullCount >= 100 ? '100+' : pullCount
    issues.textContent = Math.max(0, (data.repository.open_issues_count || 0) - pullCount)
    release.textContent = data.release?.tag_name
      ? `Latest release ${data.release.tag_name} · ${formatRelativeTime(data.release.published_at)}`
      : 'No published release yet'
    repositoryStatus.textContent = cachedAt
      ? `Offline snapshot · ${formatRelativeTime(cachedAt)}`
      : `${data.repository.language || 'Code'} · updated ${formatRelativeTime(data.repository.updated_at)}`
    renderCommits(data.commits)
  }

  function loading() {
    card.dataset.state = 'loading'
    repositoryStatus.textContent = 'Loading repository context…'
    stars.textContent = '—'
    issues.textContent = '—'
    pulls.textContent = '—'
    release.textContent = 'Checking releases…'
    const item = document.createElement('li')
    item.className = 'project-empty'
    item.textContent = 'Loading recent commits…'
    commits.replaceChildren(item)
  }

  function empty() {
    card.dataset.state = 'empty'
    projectData = null
    repositoryStatus.textContent = 'Edit the workspace to connect owner/repository.'
    stars.textContent = '—'
    issues.textContent = '—'
    pulls.textContent = '—'
    release.textContent = 'Repository context is optional.'
    const item = document.createElement('li')
    item.className = 'project-empty'
    item.textContent = 'Commits will appear after a repository is connected.'
    commits.replaceChildren(item)
  }

  async function load(force = false) {
    const workspace = getActiveWorkspace(store.getState())
    const repository = workspace.repository
    renderWorkspace()
    if (!repository) {
      loadedRepository = ''
      empty()
      return
    }
    if (!force && repository === loadedRepository && projectData) return
    loadedRepository = repository
    const thisRequest = ++requestId
    loading()
    const encoded = repository
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/')
    try {
      const [repositoryData, commitData, pullData, releaseData] = await Promise.all([
        fetchGitHub(`/repos/${encoded}`),
        fetchGitHub(`/repos/${encoded}/commits?per_page=3`),
        fetchGitHub(`/repos/${encoded}/pulls?state=open&per_page=100`),
        fetchGitHub(`/repos/${encoded}/releases?per_page=1`),
      ])
      if (thisRequest !== requestId || getActiveWorkspace(store.getState()).repository !== repository) return
      const data = {
        repository: repositoryData,
        commits: Array.isArray(commitData) ? commitData : [],
        pulls: Array.isArray(pullData) ? pullData : [],
        release: Array.isArray(releaseData) ? releaseData[0] || null : null,
      }
      writeCache(window.localStorage, cacheKey(repository), data)
      display(data)
    } catch (error) {
      if (thisRequest !== requestId) return
      console.warn('DevTab could not load the connected project.', error)
      const cached = readCache(window.localStorage, cacheKey(repository))
      if (cached?.data?.repository) {
        display(cached.data, new Date(cached.savedAt).toISOString())
        repositoryStatus.textContent = `${error.message} Showing ${formatRelativeTime(new Date(cached.savedAt).toISOString())} data.`
      } else {
        card.dataset.state = 'error'
        repositoryStatus.textContent = error.message
        release.textContent = 'Repository details unavailable.'
        renderCommits([])
      }
    }
  }

  editButton.addEventListener('click', () => workspaces.openManager())
  refreshButton.addEventListener('click', () => load(true))
  launchButton.addEventListener('click', () => sessions.restore())
  store.subscribe((state) => {
    renderWorkspace()
    const repository = getActiveWorkspace(state).repository
    if (repository !== loadedRepository) load()
  })
  renderWorkspace()
  load()

  return { reload: () => load(true) }
}
