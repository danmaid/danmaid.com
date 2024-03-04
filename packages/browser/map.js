const port = chrome.runtime.connect()

const thead = document.querySelector('thead')
const tbody = document.querySelector('tbody')

port.onMessage.addListener((message) => {
  console.log('onMessage', message)
  const tr = tbody.insertRow()
  for (const key in message) {
    tr.insertCell().textContent = JSON.stringify(message[key])
  }
})