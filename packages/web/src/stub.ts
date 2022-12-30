async function registerStub() {
  navigator.serviceWorker.register('stub.worker.js')
  location.reload()
}

async function unregisterStub() {
  const worker = await navigator.serviceWorker.getRegistration('stub.worker.js')
  worker?.unregister()
  location.reload()
}
