export function setupClock() {
  const clock = document.querySelector('#clock')
  const clockTime = document.querySelector('#clock-time')
  const clockDate = document.querySelector('#clock-date')
  const timeFormatter = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' })
  const dateFormatter = new Intl.DateTimeFormat([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  function update() {
    const now = new Date()
    clock.dateTime = now.toISOString()
    clockTime.textContent = timeFormatter.format(now)
    clockDate.textContent = dateFormatter.format(now)
  }

  update()
  window.setInterval(update, 1000)
}
