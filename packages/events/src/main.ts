import './style.css'

const items: HTMLElement[] = []
const app = document.getElementById('app')
const events = new EventSource('')

events.addEventListener('message', (ev) => {
  const div = document.createElement('div')
  div.textContent = ev.data
  div.classList.add('add')
  app?.append(div)
  setTimeout(() => {
    div.classList.add('added')
    items.push(div)
  }, 100)
  while (items.length > 10) {
    const item = items.shift()
    if (!item) continue
    item.ontransitionend = () => item.remove()
    item.classList.add('remove')
  }
})
