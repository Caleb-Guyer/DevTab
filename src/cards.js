import { CARD_IDS } from './config.js'
import { getActiveWorkspace } from './state.js'

export function setupCards(store) {
  const grid = document.querySelector('#dashboard-grid')
  const cards = [...document.querySelectorAll('[data-dashboard-card]')]
  let draggedCard = null
  let dragAllowed = false

  function apply(workspace) {
    cards.forEach((card) => {
      const cardId = card.dataset.dashboardCard
      card.hidden = !workspace.visibleCards.includes(cardId)
      card.style.order = workspace.cardOrder.indexOf(cardId)
    })
  }

  function moveCard(cardId, direction) {
    store.update(
      (data) => {
        const workspace = getActiveWorkspace(data)
        const order = [...workspace.cardOrder]
        const index = order.indexOf(cardId)
        const nextIndex = Math.max(0, Math.min(order.length - 1, index + direction))
        if (index === nextIndex) return data
        order.splice(index, 1)
        order.splice(nextIndex, 0, cardId)
        workspace.cardOrder = order
        return data
      },
      { source: 'cards' },
    )
  }

  cards.forEach((card) => {
    const handle = card.querySelector('[data-card-handle]')

    handle?.addEventListener('pointerdown', () => {
      dragAllowed = true
    })

    handle?.addEventListener('keydown', (event) => {
      if (!event.altKey || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        return
      }
      event.preventDefault()
      moveCard(card.dataset.dashboardCard, ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1)
    })

    card.addEventListener('dragstart', (event) => {
      if (!dragAllowed) {
        event.preventDefault()
        return
      }
      draggedCard = card
      card.classList.add('is-dragging')
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', card.dataset.dashboardCard)
    })

    card.addEventListener('dragend', () => {
      dragAllowed = false
      draggedCard?.classList.remove('is-dragging')
      draggedCard = null
      cards.forEach((item) => item.classList.remove('is-drop-target'))
    })

    card.addEventListener('dragover', (event) => {
      if (!draggedCard || draggedCard === card) return
      event.preventDefault()
      card.classList.add('is-drop-target')
    })

    card.addEventListener('dragleave', () => card.classList.remove('is-drop-target'))

    card.addEventListener('drop', (event) => {
      event.preventDefault()
      card.classList.remove('is-drop-target')
      const sourceId = event.dataTransfer.getData('text/plain')
      const targetId = card.dataset.dashboardCard
      if (!CARD_IDS.includes(sourceId) || !CARD_IDS.includes(targetId) || sourceId === targetId) {
        return
      }
      store.update(
        (data) => {
          const workspace = getActiveWorkspace(data)
          const order = [...workspace.cardOrder]
          const sourceIndex = order.indexOf(sourceId)
          const targetIndex = order.indexOf(targetId)
          order.splice(sourceIndex, 1)
          order.splice(targetIndex, 0, sourceId)
          workspace.cardOrder = order
          return data
        },
        { source: 'cards' },
      )
    })
  })

  grid.addEventListener('pointerup', () => {
    if (!draggedCard) dragAllowed = false
  })

  store.subscribe((state) => apply(getActiveWorkspace(state)))
  apply(getActiveWorkspace(store.getState()))
}
