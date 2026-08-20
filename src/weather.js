import { readCache, writeCache } from './state.js'
import { formatRelativeTime } from './utilities.js'

const REQUEST_TIMEOUT = 10000

function getCurrentLocation() {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('Geolocation is not supported by this browser.'))
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => {
        const messages = {
          1: 'Location permission was denied. Enter a city below instead.',
          2: 'Your location could not be determined.',
          3: 'Finding your location took too long.',
        }
        reject(new Error(messages[error.code] || 'Your location is unavailable.'))
      },
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: REQUEST_TIMEOUT },
    )
  })
}

async function fetchJson(url, message) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(message)
    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The weather request timed out.')
    if (error instanceof TypeError) throw new Error('Could not connect to the weather service.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function weatherDetails(code, isDay) {
  if ([0, 1].includes(code)) return { condition: code === 0 ? 'Clear sky' : 'Mainly clear', icon: isDay ? '☀︎' : '☾' }
  if (code === 2) return { condition: 'Partly cloudy', icon: '◐' }
  if (code === 3) return { condition: 'Overcast', icon: '☁︎' }
  if ([45, 48].includes(code)) return { condition: 'Fog', icon: '≋' }
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: 'Drizzle', icon: '☂︎' }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: 'Rain', icon: '☂︎' }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Snow', icon: '❄︎' }
  if ([95, 96, 99].includes(code)) return { condition: 'Thunderstorm', icon: '↯' }
  return { condition: 'Unknown conditions', icon: '?' }
}

function formatCoordinates({ latitude, longitude }) {
  return `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? 'N' : 'S'}, ${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? 'E' : 'W'}`
}

async function reverseGeocode(coordinates) {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
  url.search = new URLSearchParams({
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    localityLanguage: navigator.language.split('-')[0] || 'en',
  })
  try {
    const data = await fetchJson(url, 'Location lookup failed.')
    return [data.city || data.locality, data.principalSubdivision || data.countryName]
      .filter((item, index, items) => item && items.indexOf(item) === index)
      .join(', ') || formatCoordinates(coordinates)
  } catch {
    return formatCoordinates(coordinates)
  }
}

async function geocodePlace(name) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.search = new URLSearchParams({
    name,
    count: '1',
    language: navigator.language.split('-')[0] || 'en',
    format: 'json',
  })
  const data = await fetchJson(url, 'That location could not be found.')
  const match = data.results?.[0]
  if (!match || !Number.isFinite(match.latitude) || !Number.isFinite(match.longitude)) {
    throw new Error('That location could not be found.')
  }
  return {
    latitude: match.latitude,
    longitude: match.longitude,
    name: [match.name, match.admin1 || match.country].filter(Boolean).join(', '),
  }
}

async function fetchWeather(coordinates, unitPreference) {
  const temperatureUnit =
    unitPreference === 'auto'
      ? navigator.language === 'en-US'
        ? 'fahrenheit'
        : 'celsius'
      : unitPreference
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    current: 'temperature_2m,weather_code,is_day',
    temperature_unit: temperatureUnit,
    timezone: 'auto',
    forecast_days: '1',
  })
  const data = await fetchJson(url, 'The weather service could not complete the request.')
  if (
    !Number.isFinite(data.current?.temperature_2m) ||
    !Number.isInteger(data.current?.weather_code)
  ) {
    throw new Error('The weather service returned incomplete data.')
  }
  return {
    temperature: data.current.temperature_2m,
    unit: data.current_units.temperature_2m,
    ...weatherDetails(data.current.weather_code, data.current.is_day === 1),
  }
}

export function setupWeather(store) {
  const card = document.querySelector('.weather-card')
  const summary = document.querySelector('#weather-summary')
  const icon = document.querySelector('#weather-icon')
  const temperature = document.querySelector('#weather-temperature')
  const condition = document.querySelector('#weather-condition')
  const location = document.querySelector('#weather-location')
  const cacheStatus = document.querySelector('#weather-cache-status')
  const retry = document.querySelector('#weather-retry')
  const form = document.querySelector('#weather-form')
  const placeInput = document.querySelector('#weather-place')
  const unitInput = document.querySelector('#weather-unit')
  const autoButton = document.querySelector('#weather-auto')
  let lastSignature = ''

  function display(data, locationName, cachedAt = null) {
    card.dataset.state = cachedAt ? 'cached' : 'ready'
    summary.setAttribute('aria-busy', 'false')
    icon.textContent = data.icon
    temperature.textContent = `${Math.round(data.temperature)}${data.unit}`
    condition.textContent = data.condition
    location.textContent = locationName
    cacheStatus.hidden = !cachedAt
    cacheStatus.textContent = cachedAt ? `Last updated ${formatRelativeTime(cachedAt)}` : ''
    retry.hidden = true
  }

  function loading(message = 'Updating weather') {
    card.dataset.state = 'loading'
    summary.setAttribute('aria-busy', 'true')
    condition.textContent = message
    cacheStatus.hidden = true
    retry.hidden = true
  }

  function waitingForLocation() {
    card.dataset.state = 'idle'
    summary.setAttribute('aria-busy', 'false')
    icon.textContent = '◎'
    temperature.textContent = '--'
    condition.textContent = 'Choose a location'
    location.textContent = 'Use device location or enter a city below.'
    cacheStatus.hidden = true
    retry.hidden = true
  }

  function showError(error) {
    const cached = readCache(window.localStorage, 'weather')
    if (cached?.data?.weather) {
      display(cached.data.weather, cached.data.location, new Date(cached.savedAt).toISOString())
      cacheStatus.textContent = `${error.message} Showing data from ${formatRelativeTime(new Date(cached.savedAt).toISOString())}.`
      return
    }
    card.dataset.state = 'error'
    summary.setAttribute('aria-busy', 'false')
    icon.textContent = '!'
    temperature.textContent = '--'
    condition.textContent = 'Weather unavailable'
    location.textContent = error.message
    retry.hidden = false
  }

  async function load() {
    const weatherSettings = store.getState().settings.weather
    unitInput.value = weatherSettings.unit
    placeInput.value = weatherSettings.locationMode === 'manual' ? weatherSettings.locationName : ''
    loading(weatherSettings.locationMode === 'auto' ? 'Finding your location' : 'Updating weather')
    try {
      let coordinates
      let locationName
      if (
        weatherSettings.locationMode === 'manual' &&
        Number.isFinite(weatherSettings.latitude) &&
        Number.isFinite(weatherSettings.longitude)
      ) {
        coordinates = {
          latitude: weatherSettings.latitude,
          longitude: weatherSettings.longitude,
        }
        locationName = weatherSettings.locationName || formatCoordinates(coordinates)
      } else {
        coordinates = await getCurrentLocation()
        locationName = await reverseGeocode(coordinates)
      }
      const weather = await fetchWeather(coordinates, weatherSettings.unit)
      writeCache(window.localStorage, 'weather', { weather, location: locationName })
      display(weather, locationName)
    } catch (error) {
      console.warn('DevTab could not load weather.', error)
      showError(error)
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const name = placeInput.value.trim()
    if (!name) return
    loading('Finding that location')
    try {
      const match = await geocodePlace(name)
      store.update(
        (data) => {
          data.settings.weather = {
            ...data.settings.weather,
            locationMode: 'manual',
            locationName: match.name,
            latitude: match.latitude,
            longitude: match.longitude,
            unit: unitInput.value,
          }
          return data
        },
        { source: 'weather' },
      )
    } catch (error) {
      showError(error)
    }
  })

  unitInput.addEventListener('change', () => {
    store.update(
      (data) => {
        data.settings.weather.unit = unitInput.value
        return data
      },
      { source: 'weather' },
    )
  })

  autoButton.addEventListener('click', () => {
    const wasAuto = store.getState().settings.weather.locationMode === 'auto'
    store.update(
      (data) => {
        data.settings.weather = {
          ...data.settings.weather,
          locationMode: 'auto',
          locationName: '',
          latitude: null,
          longitude: null,
        }
        return data
      },
      { source: 'weather' },
    )
    if (wasAuto) load()
  })
  retry.addEventListener('click', load)
  store.subscribe((state) => {
    const signature = JSON.stringify(state.settings.weather)
    if (signature !== lastSignature) {
      lastSignature = signature
      load()
    }
  })
  lastSignature = JSON.stringify(store.getState().settings.weather)
  const initialSettings = store.getState().settings.weather
  unitInput.value = initialSettings.unit
  placeInput.value = initialSettings.locationMode === 'manual' ? initialSettings.locationName : ''
  const cached = readCache(window.localStorage, 'weather')
  if (initialSettings.locationMode === 'manual') load()
  else if (cached?.data?.weather) {
    unitInput.value = initialSettings.unit
    display(cached.data.weather, cached.data.location, new Date(cached.savedAt).toISOString())
  } else waitingForLocation()
  return { reload: load }
}
