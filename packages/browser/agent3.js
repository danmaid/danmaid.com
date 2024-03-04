chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.update({ url: 'index.html' })
})

chrome.runtime.onConnect.addListener((port) => {
  console.log('connected.', port)
  port.postMessage(new Event('xyz'))
})
