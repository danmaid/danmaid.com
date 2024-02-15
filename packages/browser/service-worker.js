chrome.action.onClicked.addListener(function (tab) {
  chrome.debugger.attach({ tabId: tab.id }, '1.2', function () {
    const timer = setInterval(() => {
      chrome.debugger.sendCommand({ tabId: tab.id }, "Input.dispatchMouseEvent", {
        type: 'mouseWheel',
        x: 100,
        y: 100,
        deltaX: 0,
        deltaY: 3
      }, function () {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        }
        console.log('done')
      })
    }, 3000)
    setTimeout(() => clearTimeout(timer), 10000)
  })
});

chrome.debugger.onEvent.addListener(function (source, method, params) {
  if (method === 'Network.responseReceived') {
    console.log('Response received:', params.response);
    // Perform your desired action with the response data
  }
});

async function attach() {
  const targets = await new Promise((r) => chrome.debugger.getTargets(r))
  console.log(targets)
}

async function updateView(id, tab) {
  const res = await fetch(`${endpoint}/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(tab)
  })
  await res.body?.cancel()
}

// init
chrome.tabs.query({ url: '*://*/*' }, async (tabs) => {
  await Promise.all(tabs.filter((v) => v.id).map((tab) => updateView(tab.id, tab)))
  const views = new EventSource(endpoint)
  views.addEventListener('change', async (ev) => {
    const data = JSON.parse(ev.data)
    console.log('change', data)
    const { id, active, autoDiscardable, highlighted, muted, openerTabId, pinned, url } = data
    if (!id) return console.warn('id is not found. ignore it.')
    if (highlighted) {
      const tab = await chrome.tabs.get(id)
      chrome.tabs.highlight({ tabs: tab.index, windowId: tab.windowId })
      chrome.windows.update(tab.windowId, { drawAttention: false, focused: true })
    }
  })
})

// const endpoint = 'https://danmaid.com/views'
const endpoint = 'https://localhost/views'

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('updated', tabId, changeInfo, tab)
  if (!tab.url?.startsWith('http')) return
  updateView(tabId, tab)
})

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  console.log('remove', tabId, removeInfo)
  const res = await fetch(`${endpoint}/${tabId}`, { method: 'DELETE' })
  await res.body?.cancel()
})

