import './style.css'

const NOTE_STORAGE_KEY = 'devtab.quick-note'
const NOTE_SAVE_DELAY = 300
const WEATHER_REQUEST_TIMEOUT = 10000

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

function getCurrentLocation() {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('Geolocation is not supported by this browser.'))
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
      },
      (error) => {
        const errorMessages = {
          1: 'Location permission was denied. Allow access and try again.',
          2: 'Your location could not be determined. Try again shortly.',
          3: 'Finding your location took too long. Try again.',
        }

        reject(new Error(errorMessages[error.code] ?? 'Your location is unavailable.'))
      },
      {
        enableHighAccuracy: false,
        maximumAge: 10 * 60 * 1000,
        timeout: WEATHER_REQUEST_TIMEOUT,
      },
    )
  })
}

async function fetchJson(url, errorMessage) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), WEATHER_REQUEST_TIMEOUT)

  try {
    const response = await window.fetch(url, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(errorMessage)
    }

    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The weather request timed out. Try again.')
    }

    if (error instanceof TypeError) {
      throw new Error('Could not connect to the weather service. Check your connection.')
    }

    if (error instanceof SyntaxError) {
      throw new Error(errorMessage)
    }

    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function getWeatherDetails(code, isDay) {
  const dayOrNightIcon = isDay ? '\u2600\uFE0E' : '\u263E\uFE0E'

  if (code === 0) return { condition: 'Clear sky', icon: dayOrNightIcon }
  if (code === 1) return { condition: 'Mainly clear', icon: dayOrNightIcon }
  if (code === 2) return { condition: 'Partly cloudy', icon: '\u25D0' }
  if (code === 3) return { condition: 'Overcast', icon: '\u2601\uFE0E' }
  if ([45, 48].includes(code)) return { condition: 'Fog', icon: '\u224B' }
  if ([51, 53, 55].includes(code)) return { condition: 'Drizzle', icon: '\u2602\uFE0E' }
  if ([56, 57].includes(code)) return { condition: 'Freezing drizzle', icon: '\u2744\uFE0E' }
  if ([61, 63, 65].includes(code)) return { condition: 'Rain', icon: '\u2602\uFE0E' }
  if ([66, 67].includes(code)) return { condition: 'Freezing rain', icon: '\u2744\uFE0E' }
  if ([71, 73, 75, 77].includes(code)) return { condition: 'Snow', icon: '\u2744\uFE0E' }
  if ([80, 81, 82].includes(code)) return { condition: 'Rain showers', icon: '\u2602\uFE0E' }
  if ([85, 86].includes(code)) return { condition: 'Snow showers', icon: '\u2744\uFE0E' }
  if (code === 95) return { condition: 'Thunderstorm', icon: '\u21AF' }
  if ([96, 99].includes(code)) {
    return { condition: 'Thunderstorm with hail', icon: '\u21AF' }
  }

  return { condition: 'Unknown conditions', icon: '?' }
}

function formatCoordinates({ latitude, longitude }) {
  const latitudeDirection = latitude >= 0 ? 'N' : 'S'
  const longitudeDirection = longitude >= 0 ? 'E' : 'W'

  return `${Math.abs(latitude).toFixed(2)}\u00B0 ${latitudeDirection}, ${Math.abs(longitude).toFixed(2)}\u00B0 ${longitudeDirection}`
}

function formatLocation(location, coordinates) {
  const locality = location.city || location.locality
  const region = location.principalSubdivision || location.countryName
  const parts = [locality, region].filter(
    (part, index, values) => part && values.indexOf(part) === index,
  )

  return parts.length > 0 ? parts.join(', ') : formatCoordinates(coordinates)
}

async function fetchWeather(coordinates) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  const temperatureUnit = navigator.language === 'en-US' ? 'fahrenheit' : 'celsius'

  url.search = new URLSearchParams({
    latitude: coordinates.latitude.toString(),
    longitude: coordinates.longitude.toString(),
    current: 'temperature_2m,weather_code,is_day',
    temperature_unit: temperatureUnit,
    timezone: 'auto',
    forecast_days: '1',
  })

  const data = await fetchJson(url, 'The weather service could not complete the request.')
  const temperature = data.current?.temperature_2m
  const weatherCode = data.current?.weather_code
  const isDay = data.current?.is_day
  const unit = data.current_units?.temperature_2m

  if (
    !Number.isFinite(temperature) ||
    !Number.isInteger(weatherCode) ||
    ![0, 1].includes(isDay) ||
    typeof unit !== 'string'
  ) {
    throw new Error('The weather service returned incomplete data. Try again.')
  }

  return {
    temperature,
    unit,
    ...getWeatherDetails(weatherCode, isDay === 1),
  }
}

async function fetchLocationName(coordinates) {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')

  url.search = new URLSearchParams({
    latitude: coordinates.latitude.toString(),
    longitude: coordinates.longitude.toString(),
    localityLanguage: navigator.language.split('-')[0] || 'en',
  })

  try {
    const data = await fetchJson(url, 'Location lookup failed.')
    return formatLocation(data, coordinates)
  } catch (error) {
    console.warn('DevTab could not load a readable location name.', error)
    return formatCoordinates(coordinates)
  }
}

function setupWeatherWidget() {
  const weatherCard = document.querySelector('.weather-card')
  const weatherSummary = document.querySelector('#weather-summary')
  const weatherIcon = document.querySelector('#weather-icon')
  const weatherTemperature = document.querySelector('#weather-temperature')
  const weatherCondition = document.querySelector('#weather-condition')
  const weatherLocation = document.querySelector('#weather-location')
  const retryButton = document.querySelector('#weather-retry')

  function showLoadingState() {
    weatherCard.dataset.state = 'loading'
    weatherSummary.setAttribute('aria-busy', 'true')
    weatherIcon.textContent = '--'
    weatherTemperature.textContent = '--'
    weatherCondition.textContent = 'Finding your location'
    weatherLocation.textContent = 'Browser permission may be required.'
    retryButton.hidden = true
    retryButton.disabled = true
  }

  function showWeatherState(weather, location) {
    weatherCard.dataset.state = 'ready'
    weatherSummary.setAttribute('aria-busy', 'false')
    weatherIcon.textContent = weather.icon
    weatherTemperature.textContent = `${Math.round(weather.temperature)}${weather.unit}`
    weatherCondition.textContent = weather.condition
    weatherLocation.textContent = location
    retryButton.hidden = true
    retryButton.disabled = false
  }

  function showErrorState(error) {
    console.warn('DevTab could not load weather.', error)
    weatherCard.dataset.state = 'error'
    weatherSummary.setAttribute('aria-busy', 'false')
    weatherIcon.textContent = '!'
    weatherTemperature.textContent = '--'
    weatherCondition.textContent = 'Weather unavailable'
    weatherLocation.textContent = error.message || 'Try again shortly.'
    retryButton.hidden = false
    retryButton.disabled = false
  }

  async function loadWeather() {
    showLoadingState()

    try {
      const coordinates = await getCurrentLocation()
      const [weather, location] = await Promise.all([
        fetchWeather(coordinates),
        fetchLocationName(coordinates),
      ])

      showWeatherState(weather, location)
    } catch (error) {
      showErrorState(error)
    }
  }

  retryButton.addEventListener('click', loadWeather)
  loadWeather()
}

setupWeatherWidget()
