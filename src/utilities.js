export const SEARCH_ENGINES = {
  google: {
    label: 'Google',
    buildUrl: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  },
  duckduckgo: {
    label: 'DuckDuckGo',
    buildUrl: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  },
  github: {
    label: 'GitHub',
    buildUrl: (query) => `https://github.com/search?q=${encodeURIComponent(query)}`,
  },
  mdn: {
    label: 'MDN',
    buildUrl: (query) =>
      `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query)}`,
  },
}

export function normalizeLinkUrl(value) {
  const trimmed = value.trim()
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  const url = new URL(withProtocol)

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Links must use http or https.')
  }

  return url.href
}

export function looksLikeUrl(value) {
  const trimmed = value.trim()
  return /^(https?:\/\/|localhost(?::\d+)?(?:\/|$)|(?:[\w-]+\.)+[a-z]{2,}(?:\/|$))/i.test(
    trimmed,
  )
}

export function buildSearchDestination(query, engineId) {
  if (looksLikeUrl(query)) return normalizeLinkUrl(query)
  const engine = SEARCH_ENGINES[engineId] || SEARCH_ENGINES.google
  return engine.buildUrl(query.trim())
}

export function deriveMark(label) {
  const words = label.trim().split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words.map((word) => word[0]).join('') : words[0] || 'L')
    .slice(0, 4)
    .toUpperCase()
}

export function createId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function parseCommandInput(value) {
  const normalized = value.trim().replace(/^>/, '').trim()
  const [name = '', ...parts] = normalized.split(/\s+/)
  return { name: name.toLowerCase(), args: parts.join(' ').trim() }
}

export function scoreMatch(query, candidate) {
  const needle = query.trim().toLowerCase()
  const haystack = candidate.toLowerCase()
  if (!needle) return 1
  if (haystack.startsWith(needle)) return 100 - haystack.length
  if (haystack.includes(needle)) return 60 - haystack.indexOf(needle)

  let score = 0
  let position = 0
  for (const character of needle) {
    const match = haystack.indexOf(character, position)
    if (match === -1) return 0
    score += Math.max(1, 10 - (match - position))
    position = match + 1
  }
  return score
}

export function calculateExpression(expression) {
  const source = expression.replace(/\s+/g, '')
  if (!source || !/^[\d.+\-*/()%]+$/.test(source)) {
    throw new Error('Use numbers and +, -, *, /, %, or parentheses.')
  }

  let index = 0

  function parseNumber() {
    const start = index
    while (/[\d.]/.test(source[index] || '')) index += 1
    const value = Number(source.slice(start, index))
    if (!Number.isFinite(value)) throw new Error('That calculation is not valid.')
    return value
  }

  function parseFactor() {
    if (source[index] === '+') {
      index += 1
      return parseFactor()
    }
    if (source[index] === '-') {
      index += 1
      return -parseFactor()
    }
    if (source[index] === '(') {
      index += 1
      const value = parseAdditive()
      if (source[index] !== ')') throw new Error('A closing parenthesis is missing.')
      index += 1
      return value
    }
    return parseNumber()
  }

  function parseMultiplicative() {
    let value = parseFactor()
    while (['*', '/', '%'].includes(source[index])) {
      const operator = source[index]
      index += 1
      const right = parseFactor()
      if ((operator === '/' || operator === '%') && right === 0) {
        throw new Error('Division by zero is not supported.')
      }
      if (operator === '*') value *= right
      if (operator === '/') value /= right
      if (operator === '%') value %= right
    }
    return value
  }

  function parseAdditive() {
    let value = parseMultiplicative()
    while (['+', '-'].includes(source[index])) {
      const operator = source[index]
      index += 1
      const right = parseMultiplicative()
      value = operator === '+' ? value + right : value - right
    }
    return value
  }

  const result = parseAdditive()
  if (index !== source.length || !Number.isFinite(result)) {
    throw new Error('That calculation is not valid.')
  }
  return Number(result.toFixed(10))
}

export function formatRelativeTime(dateString) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'unknown time'
  const difference = date.getTime() - Date.now()
  const absolute = Math.abs(difference)
  const units = [
    ['year', 365 * 24 * 60 * 60 * 1000],
    ['month', 30 * 24 * 60 * 60 * 1000],
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
  ]
  const [unit, milliseconds] = units.find(([, size]) => absolute >= size) || ['second', 1000]
  return new Intl.RelativeTimeFormat([], { numeric: 'auto' }).format(
    Math.round(difference / milliseconds),
    unit,
  )
}
