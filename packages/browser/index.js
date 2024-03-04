const port = chrome.runtime.connect()

const targets = new Map()
function getTable(key) {
  const target = targets.get(key)
  if (target) return target
  const table = document.body.appendChild(document.createElement('table'))
  const th = table.createTHead().insertRow().insertCell()
  th.colSpan = 10
  th.textContent = key
  targets.set(key, table)
  return table
}

port.onMessage.addListener((message) => {
  console.log('onMessage', message)
  const table = getTable(message.target)
  const tr = table.insertRow()
  for (const key in message) {
    if (key === 'target') continue
    tr.insertCell().textContent = JSON.stringify(message[key])
  }
})

console.log('storage', chrome.storage)

document.getElementById('clear').addEventListener('click', () => {
  chrome.storage.local.clear()
})

new class {
  url = 'https://localhost/views/'
  root = document.getElementById('source')
  constructor() {
    this.get()
    const source = new EventSource(this.url)
    source.addEventListener('message', () => this.get())
    this.root.querySelector('#reload').addEventListener('click', () => this.get())
  }

  async get() {
    const res = await fetch(this.url, { headers: { accept: 'application/json' } })
    const items = await res.json()
    const thead = this.root.querySelector('thead')
    const tbody = this.root.querySelector('tbody')
    thead.replaceChildren()
    const headers = new Set()
    for (const item of items) for (const key in item) headers.add(key)
    const tr = thead.insertRow()
    for (const header of headers) {
      tr.appendChild(document.createElement('th')).textContent = header
    }

    tbody.replaceChildren()
    for (const item of items) {
      const tr = tbody.insertRow()
      const cells = new Map([...headers].map(key => [key, tr.insertCell()]))
      for (const key in item) {
        const td = cells.get(key)
        td.textContent = JSON.stringify(item[key])
      }
    }
  }
}

new class {
  root = document.getElementById('tabs')

  constructor() {
    this.root.querySelector('#reload').addEventListener('click', () => this.get())
    chrome.tabs.onUpdated.addListener(() => this.get())
    chrome.tabs.onRemoved.addListener(() => this.get())
    chrome.tabs.onCreated.addListener(() => this.get())
  }

  async get() {
    const items = await chrome.tabs.query({})
    const thead = this.root.querySelector('thead')
    const tbody = this.root.querySelector('tbody')
    thead.replaceChildren()
    const headers = new Set()
    for (const item of items) for (const key in item) headers.add(key)
    const tr = thead.insertRow()
    for (const header of headers) {
      tr.appendChild(document.createElement('th')).textContent = header
    }

    tbody.replaceChildren()
    for (const item of items) {
      const tr = tbody.insertRow()
      const cells = new Map([...headers].map(key => [key, tr.insertCell()]))
      for (const key in item) {
        const td = cells.get(key)
        td.textContent = JSON.stringify(item[key])
      }
    }
  }
}

new class {
  root = document.getElementById('store')

  constructor() {
    this.root.querySelector('#reload').addEventListener('click', () => this.get())
  }

  async get() {
    const items = await chrome.runtime.sendMessage('getStore')
    console.log(items)
    const thead = this.root.querySelector('thead')
    const tbody = this.root.querySelector('tbody')
    thead.replaceChildren()
    const headers = new Set()
    for (const item of items) for (const key in item) headers.add(key)
    const tr = thead.insertRow()
    for (const header of headers) {
      tr.appendChild(document.createElement('th')).textContent = header
    }

    tbody.replaceChildren()
    for (const item of items) {
      const tr = tbody.insertRow()
      const cells = new Map([...headers].map(key => [key, tr.insertCell()]))
      for (const key in item) {
        const td = cells.get(key)
        td.textContent = JSON.stringify(item[key])
      }
    }
  }
}
