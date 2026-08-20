import { GITHUB_USERNAME } from './config.js'
import { readCache, writeCache } from './state.js'
import { getActiveWorkspace } from './state.js'
import { formatRelativeTime } from './utilities.js'

const REQUEST_TIMEOUT = 10000
const API_VERSION = '2022-11-28'

async function fetchGitHub(path) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    const response = await fetch(`https://api.github.com${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': API_VERSION },
    })
    if (!response.ok) {
      const remaining = response.headers.get('x-ratelimit-remaining')
      if ([403, 429].includes(response.status) && remaining === '0') {
        throw new Error('GitHub’s public API limit was reached.')
      }
      throw new Error(response.status === 404 ? 'The GitHub profile was not found.' : 'GitHub could not complete the request.')
    }
    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The GitHub request timed out.')
    if (error instanceof TypeError) throw new Error('Could not connect to GitHub.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function eventDescription(event) {
  const repository = event.repo?.name || 'a repository'
  const actions = {
    PushEvent: `Pushed to ${repository}`,
    CreateEvent: `Created ${event.payload?.ref_type || 'something'} in ${repository}`,
    IssuesEvent: `${event.payload?.action || 'Updated'} an issue in ${repository}`,
    PullRequestEvent: `${event.payload?.action || 'Updated'} a pull request in ${repository}`,
    WatchEvent: `Starred ${repository}`,
    ForkEvent: `Forked ${repository}`,
    IssueCommentEvent: `Commented in ${repository}`,
  }
  return actions[event.type] || `${event.type.replace(/Event$/, '')} in ${repository}`
}

export function setupGitHub(store) {
  const card = document.querySelector('.github-card')
  const profileLink = document.querySelector('#github-profile-link')
  const avatar = document.querySelector('#github-avatar')
  const avatarPlaceholder = document.querySelector('#github-avatar-placeholder')
  const username = document.querySelector('#github-username')
  const summary = document.querySelector('#github-summary')
  const cacheStatus = document.querySelector('#github-cache-status')
  const repositoryCount = document.querySelector('#github-repository-count')
  const followerCount = document.querySelector('#github-follower-count')
  const openCount = document.querySelector('#github-open-count')
  const repositoryList = document.querySelector('#github-repositories')
  const eventList = document.querySelector('#github-events')
  const filterInput = document.querySelector('#repository-filter')
  const favoriteFilter = document.querySelector('#favorite-filter')
  const retry = document.querySelector('#github-retry')
  let githubData = null
  let lastFavorites = JSON.stringify(getActiveWorkspace(store.getState()).favoriteRepositories)

  function showMessage(message) {
    const item = document.createElement('li')
    item.className = 'repository-message'
    item.textContent = message
    repositoryList.replaceChildren(item)
  }

  function showRepositoryLoading() {
    const items = Array.from({ length: 6 }, () => {
      const item = document.createElement('li')
      item.className = 'repository-loading-item'
      item.setAttribute('aria-hidden', 'true')
      return item
    })
    repositoryList.replaceChildren(...items)
  }

  function showEventLoading() {
    const items = Array.from({ length: 3 }, () => {
      const item = document.createElement('li')
      item.className = 'event-loading-item'
      item.setAttribute('aria-hidden', 'true')
      return item
    })
    eventList.replaceChildren(...items)
  }

  function renderRepositories() {
    if (!githubData) return
    const query = filterInput.value.trim().toLowerCase()
    const favorites = getActiveWorkspace(store.getState()).favoriteRepositories
    const repositories = githubData.repositories
      .filter((repository) => !query || `${repository.name} ${repository.description || ''} ${repository.language || ''}`.toLowerCase().includes(query))
      .filter((repository) => !favoriteFilter.checked || favorites.includes(repository.name))
      .slice(0, 6)

    if (repositories.length === 0) {
      showMessage('No repositories match that filter.')
      return
    }

    const items = repositories.map((repository) => {
      const item = document.createElement('li')
      const link = document.createElement('a')
      const top = document.createElement('span')
      const name = document.createElement('span')
      const description = document.createElement('span')
      const metadata = document.createElement('span')
      const favorite = document.createElement('button')
      item.className = 'repository-item'
      link.className = 'repository-link'
      link.href = repository.html_url
      link.target = '_blank'
      link.rel = 'noreferrer'
      top.className = 'repository-title-row'
      name.className = 'repository-name'
      name.textContent = repository.name
      description.className = 'repository-description'
      description.textContent = repository.description || 'No description provided.'
      metadata.className = 'repository-metadata'
      metadata.textContent = `${repository.language || 'Code'} · ★ ${repository.stargazers_count} · ${repository.open_issues_count} open · ${formatRelativeTime(repository.updated_at)}`
      favorite.type = 'button'
      favorite.className = 'favorite-button'
      favorite.dataset.active = String(favorites.includes(repository.name))
      favorite.textContent = favorites.includes(repository.name) ? '◆' : '◇'
      favorite.setAttribute('aria-label', `${favorites.includes(repository.name) ? 'Remove' : 'Add'} ${repository.name} ${favorites.includes(repository.name) ? 'from' : 'to'} favorites`)
      favorite.addEventListener('click', () => {
        store.update((data) => {
          const workspace = getActiveWorkspace(data)
          workspace.favoriteRepositories = workspace.favoriteRepositories.includes(repository.name)
            ? workspace.favoriteRepositories.filter((nameItem) => nameItem !== repository.name)
            : [...workspace.favoriteRepositories, repository.name]
          return data
        }, { source: 'github-favorite' })
      })
      top.append(name)
      link.append(top, description, metadata)
      item.append(link, favorite)
      return item
    })
    repositoryList.replaceChildren(...items)
  }

  function renderEvents(events) {
    const items = events.slice(0, 5).map((event) => {
      const item = document.createElement('li')
      const text = document.createElement('span')
      const time = document.createElement('time')
      text.textContent = eventDescription(event)
      time.dateTime = event.created_at
      time.textContent = formatRelativeTime(event.created_at)
      item.append(text, time)
      return item
    })
    if (items.length === 0) {
      const item = document.createElement('li')
      item.textContent = 'No recent public events.'
      items.push(item)
    }
    eventList.replaceChildren(...items)
  }

  function display(data, cachedAt = null) {
    githubData = data
    card.dataset.state = cachedAt ? 'cached' : 'ready'
    card.setAttribute('aria-busy', 'false')
    profileLink.href = data.profile.html_url
    username.textContent = `@${data.profile.login}`
    summary.textContent = data.profile.bio || data.profile.name || 'Public GitHub profile'
    repositoryCount.textContent = new Intl.NumberFormat().format(data.profile.public_repos)
    followerCount.textContent = new Intl.NumberFormat().format(data.profile.followers)
    openCount.textContent = new Intl.NumberFormat().format(data.openCount)
    const avatarUrl = new URL(data.profile.avatar_url)
    avatarUrl.searchParams.set('s', '96')
    avatar.src = avatarUrl.href
    avatar.alt = `${data.profile.login}'s GitHub avatar`
    avatar.hidden = false
    avatarPlaceholder.hidden = true
    cacheStatus.hidden = !cachedAt
    cacheStatus.textContent = cachedAt ? `Cached ${formatRelativeTime(cachedAt)}` : ''
    retry.hidden = true
    renderRepositories()
    renderEvents(data.events)
  }

  function loading() {
    card.dataset.state = 'loading'
    card.setAttribute('aria-busy', 'true')
    summary.textContent = 'Loading public profile…'
    cacheStatus.hidden = true
    showRepositoryLoading()
    showEventLoading()
    retry.hidden = true
  }

  function showError(error) {
    const cached = readCache(window.localStorage, 'github')
    if (cached?.data?.profile) {
      display(cached.data, new Date(cached.savedAt).toISOString())
      cacheStatus.textContent = `${error.message} Showing cached data from ${formatRelativeTime(new Date(cached.savedAt).toISOString())}.`
      return
    }
    card.dataset.state = 'error'
    card.setAttribute('aria-busy', 'false')
    avatar.hidden = true
    avatarPlaceholder.hidden = false
    avatarPlaceholder.textContent = '!'
    summary.textContent = error.message
    showMessage('Recent repositories could not be loaded.')
    eventList.replaceChildren(Object.assign(document.createElement('li'), { textContent: 'Activity unavailable.' }))
    retry.hidden = false
  }

  async function load() {
    loading()
    try {
      const params = new URLSearchParams({ sort: 'updated', direction: 'desc', type: 'owner', per_page: '30' })
      const [profile, repositories, events, issues] = await Promise.all([
        fetchGitHub(`/users/${encodeURIComponent(GITHUB_USERNAME)}`),
        fetchGitHub(`/users/${encodeURIComponent(GITHUB_USERNAME)}/repos?${params}`),
        fetchGitHub(`/users/${encodeURIComponent(GITHUB_USERNAME)}/events/public?per_page=10`),
        fetchGitHub(`/search/issues?q=user:${encodeURIComponent(GITHUB_USERNAME)}+is:open&per_page=1`),
      ])
      if (!profile?.login || !Array.isArray(repositories) || !Array.isArray(events)) {
        throw new Error('GitHub returned incomplete data.')
      }
      const data = { profile, repositories, events, openCount: issues.total_count || 0 }
      writeCache(window.localStorage, 'github', data)
      display(data)
    } catch (error) {
      console.warn('DevTab could not load GitHub data.', error)
      showError(error)
    }
  }

  avatar.addEventListener('error', () => {
    avatar.hidden = true
    avatarPlaceholder.hidden = false
    avatarPlaceholder.textContent = 'CG'
  })
  filterInput.addEventListener('input', renderRepositories)
  favoriteFilter.addEventListener('change', renderRepositories)
  retry.addEventListener('click', load)
  store.subscribe((state) => {
    const favorites = JSON.stringify(getActiveWorkspace(state).favoriteRepositories)
    if (favorites !== lastFavorites) {
      lastFavorites = favorites
      renderRepositories()
    }
  })
  load()
  return { reload: load }
}
