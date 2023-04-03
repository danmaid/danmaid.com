import './style.css'

async function edit() {
  const { default: str } = await import('./edit.html?raw')
  const parser = new DOMParser()
  const doc = parser.parseFromString(str, 'text/html')
  document.getElementById('main')?.replaceChildren(...doc.body.children)
}

async function show() {
  const { default: str } = await import('./show.html?raw')
  const parser = new DOMParser()
  const doc = parser.parseFromString(str, 'text/html')
  document.getElementById('main')?.replaceChildren(...doc.body.children)
}

document.getElementById('edit')?.addEventListener('click', edit)
document.getElementById('show')?.addEventListener('click', show)
