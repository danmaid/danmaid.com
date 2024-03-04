chrome.action.onClicked.addListener(async () => {
  console.log('pendings', syncMap.pendings)
  await chrome.storage.local.clear()
})
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('store changed.', changes, areaName)
})

addEventListener('unhandledrejection', (ev) => {
  console.error('cause', ev.reason.cause)
})

const syncMap = new class TwoWayMap extends class StoredMap extends Map {
  pendings = new class extends Set {
    add(value) {
      if (!(value instanceof Promise)) throw TypeError('value must Promise')
      value.finally(() => this.delete(value))
      return super.add(value)
    }
  }()
  async load() {
    const kv = await chrome.storage.local.get(null)
    for (const [k, v] of Object.entries(kv)) {
      super.set(k, Promise.resolve(v))
    }
  }
  set(key, value) {
    if (!(value instanceof Promise)) throw TypeError('value must Promise')
    const k = String(key)
    const r = super.set(k, value)
    this.pendings.add(value
      .then((v) => chrome.storage.local.set({ [k]: v }))
      .catch(() => chrome.storage.local.remove(k))
    )
    return r
  }
  delete(key) {
    const k = String(key)
    const r = super.delete(k)
    this.pendings.add(chrome.storage.local.remove(k))
    return r
  }
  get(key) {
    return super.get(String(key))
  }
}{
  set(key, value) {
    if (!(value instanceof Promise)) throw TypeError('value must Promise')
    console.log('set', key, value)
    this.pendings.add(value.then((rKey) => super.set(rKey, Promise.resolve(key))))
    return super.set(key, value)
  }
  delete(key) {
    const value = this.get(key)
    if (value) this.pendings.add(value.then((rKey) => super.delete(rKey)))
    return super.delete(key)
  }
}()
const endpoint = new URL('https://localhost/views')
// const endpoint = 'https://danmaid.com/views'
const remote = new EventSource(endpoint)

chrome.tabs.onCreated.addListener(async (tab) => {
  console.log(stop, 'onCreated', tab)
  const { id } = tab
  if (!id) return console.warn('ignore. id not found.')
  const prev = syncMap.get(id)
  console.log(stop, 'prev', prev)
  if (!prev) {
    const url = new URL(endpoint)
    url.pathname += '/' + id
    const job = putTab(tab)
    syncMap.set(id, job)
    syncMap.set(url.href, job.then(() => id))
  }
})
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  console.log('onUpdated', tabId, info, tab)
  const prev = syncMap.get(tabId)
  if (!prev) return console.warn('ignore. prev not found.')
  const url = await prev
  syncMap.set(tabId, patchTab(url, info).catch(() => putTab(tab)))
})
chrome.tabs.onRemoved.addListener(async (tabId, _info) => {
  console.log('onRemoved', tabId, _info)
  const prev = syncMap.get(tabId)
  if (!prev) return console.warn('ignore. prev not found.')
  syncMap.delete(tabId)
  const res = await fetch(await prev, { method: 'DELETE' })
  await res.body?.cancel()
})

let stop = 10
remote.addEventListener('change', async ({ data: path }) => {
  if (!path.startsWith(endpoint.pathname)) return
  if (stop-- < 0) return
  console.log(stop, 'change', path)
  const url = new URL(path, endpoint)
  const prev = syncMap.get(url.href)
  console.log(stop, 'prev', prev)
  if (prev) {
    const id = await prev
    console.log('id', id)
    syncMap.set(url.href, getData(url.href).then((data) => updateTab(id, data)))
  } else {
    syncMap.set(url.href, getData(url.href).then((data) => createTab(data)))
  }
})
// remote.addEventListener('remove', async ({ data: path }) => {
//   console.log('remove', path)
//   const url = new URL(path, endpoint)
//   const prev = syncMap.get(url.href)
//   console.log('prev', prev)
//   syncMap.delete(url.href)
//   if (prev) await chrome.tabs.remove(await prev)
// })

addEventListener('resume', async () => {
  // load map
  await syncMap.load()
  console.log('map loaded.', syncMap)
  // // remote -> local
  // const res = await fetch(endpoint + '/', { headers: { accept: 'application/json' } })
  // const items = await res.json()
  // for (const data of items) {
  //   const { id } = data
  //   if (!id) return console.warn('ignore. id not found.')
  //   const path = endpoint.pathname + '/' + id
  //   const prev = remoteLocalMap.get(path)
  //   console.log(prev)
  //   if (prev) {
  //     remoteLocalMap.set(path, prev.then((id) => updateTab(id, data)))
  //   } else {
  //     remoteLocalMap.set(path, createTab(data).then((id) => {
  //       localRemoteMap.set(id, new URL(path, endpoint).href)
  //       return id
  //     }))
  //   }
  // }
  // // local -> remote
  // for (const tab of await chrome.tabs.query({})) {
  //   const { id } = tab
  //   if (!id) return console.warn('ignore. id not found.')
  //   const prev = localRemoteMap.get(id)
  //   if (prev) {
  //     localRemoteMap.set(id, prev.then((url) => patchTab(url, tab).catch(() => putTab(tab).then((url) => {
  //       remoteLocalMap.set(url, tabId)
  //       return url
  //     }))))
  //   } else {
  //     localRemoteMap.set(id, putTab(tab).then((url) => {
  //       remoteLocalMap.set(url, id)
  //       return url
  //     }))
  //   }
  // }
})
dispatchEvent(new Event('resume'))

async function putTab(tab) {
  const { id } = tab
  const url = new URL(endpoint)
  url.pathname += '/' + id
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(tab),
  })
  await res.body?.cancel()
  return res.url
}
async function patchTab(url, info) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(info),
  })
  await res.body?.cancel()
  return res.url
}
async function getData(path) {
  const res = await fetch(new URL(path, endpoint), {
    headers: { accept: 'application/json' }
  })
  return res.json()
}
async function createTab(data) {
  const init = data.url ? { url: data.url } : {}
  const { id } = await chrome.tabs.create(init)
  return String(id)
}
async function updateTab(id, data) {
  console.log('updateTab', id, data)
  const tabId = parseInt(id)
  const tab = await chrome.tabs.get(tabId)
  const change = diff(tab, data)
  if (!change) return id
  console.log('change', change)
  await chrome.tabs.update(tabId, change)
  return id
}

function diff(tab, data) {
  const change = {}
  if (data.active && tab.active !== data.active) change.active = data.active
  if (data.autoDiscardable && tab.autoDiscardable !== data.autoDiscardable) change.autoDiscardable = data.autoDiscardable
  if (data.highlighted && tab.highlighted !== data.highlighted) change.highlighted = data.highlighted
  // if (data.mutedInfo.muted && tab.mutedInfo?.muted !== data.mutedInfo?.muted) change.muted = data.mutedInfo.muted
  if (data.openerTabId && tab.openerTabId !== data.openerTabId) change.openerTabId = data.openerTabId
  if (data.pinned && tab.pinned !== data.pinned) change.pinned = data.pinned
  if (data.url && tab.url !== data.url) change.url = data.url
  if (Object.keys(change).length < 1) return
  return change
}

////
// chrome.action.onClicked.addListener(async () => {
//   await chrome.storage.local.clear()
//   console.log(await chrome.storage.local.get(null))
// })

// let loading = Promise.resolve()

// // local -> remote
// chrome.tabs.onUpdated.addListener((tabId, _info, tab) =>
//   loading.then(() => localToRemote(tabId, _info)))
// chrome.tabs.onRemoved.addListener(async (tabId, info) => {
//   if (info.isWindowClosing) return
//   await loading
//   removeRemote(tabId)
// })
// chrome.tabs.onUpdated.addListener((tabId, info, tab) => console.log(tabId, info, tab))

// chrome.runtime.onInstalled.addListener(() => loading = syncAll())
// chrome.runtime.onStartup.addListener(() => loading = syncAll())

// // remote -> local @todo: Web Push
// const path = new URL(endpoint).pathname
// const map = new Map()
// remote.addEventListener('change', async ({ data }) => {
//   if (!data.startsWith(path)) return
//   await loading
//   const prev = map.get(data)
//   if (prev) await Promise.allSettled([prev])
//   map.set(data, remoteToLocal(data))
// })
// remote.addEventListener('remove', async ({ data }) => {
//   if (!data.startsWith(path)) return
//   await loading
//   const prev = map.get(data)
//   if (prev) await Promise.allSettled([prev])
//   map.set(data, removeLocal(data))
// })

// load()

// async function localToRemote(tabId, tab) {
//   const kv = await chrome.storage.local.get(`${tabId}`)
//   const value = kv[`${tabId}`]
//   const url = value ? new URL(value, endpoint) : new URL(endpoint)
//   if (!value) {
//     url.pathname += '/' + tabId
//     await chrome.storage.local.set({ [url.pathname]: tabId, [`${tabId}`]: url.pathname })
//   }
//   const res = await fetch(url, {
//     method: 'PATCH',
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify(tab),
//   })
//   await res.body?.cancel()
// }

// async function remoteToLocal(path, value) {
//   const kv = await chrome.storage.local.get(path)
//   const tabId = kv[path]
//   const data = value || await fetch(new URL(path, endpoint), {
//     headers: { accept: 'application/json' }
//   }).then((v) => v.json())
//   if (tabId) {
//     const tab = await chrome.tabs.get(tabId)
//     const change = diff(tab, data)
//     if (!change) return tabId
//     await chrome.tabs.update(tabId, change)
//     return tabId
//   }
//   const { active, index, pinned, url } = data
//   const { id } = await chrome.tabs.create({ active, index, pinned, url })
//   await chrome.storage.local.set({ [path]: id, [`${id}`]: path })
//   return id
// }

// async function removeRemote(tabId) {
//   const kv = await chrome.storage.local.get(`${tabId}`)
//   const value = kv[`${tabId}`]
//   if (!value) throw Error('not found.')
//   await chrome.storage.local.remove(`${tabId}`)
//   const res = await fetch(new URL(value, endpoint), { method: 'DELETE' })
//   await res.body?.cancel()
// }

// async function removeLocal(path) {
//   const kv = await chrome.storage.local.get(path)
//   const tabId = kv[path]
//   if (tabId) {
//     await chrome.storage.local.remove([`${tabId}`, path])
//     await chrome.tabs.remove(tabId)
//   }
// }

// async function syncAll() {
//   const loaded = await load()
//   console.log('loaded', loaded)
//   for (const tab of await chrome.tabs.query({})) {
//     const tabId = tab.id
//     if (!tabId) continue
//     if (loaded.includes(tabId)) continue
//     try {
//       await localToRemote(tabId, tab)
//     } catch (err) {
//       console.warn('ignore.', err)
//       continue
//     }
//   }
// }

// async function load() {
//   const res = await fetch(endpoint + '/', { headers: { accept: 'application/json' } })
//   const data = await res.json()
//   console.log('data', data)
//   const loaded = []
//   for (const view of data) {
//     const path = new URL(endpoint).pathname + '/' + view.id
//     try {
//       const tabId = await remoteToLocal(path, view)
//       loaded.push(tabId)
//     } catch (err) {
//       console.warn('create', err)
//       const { active, index, pinned, url } = data
//       const { id } = await chrome.tabs.create({ active, index, pinned, url })
//       await chrome.storage.local.set({ [path]: id, [`${id}`]: path })
//       loaded.push(id)
//     }
//   }
//   return loaded
// }

// async function getView(viewPath) {
//   const res = await fetch(new URL(viewPath, endpoint), { headers: { accept: 'application/json' } })
//   return await res.json()
// }
// async function updateView(viewPath, tab) {
//   const res = await fetch(new URL(viewPath, endpoint), {
//     method: 'PUT',
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify(tab),
//   })
//   await res.body?.cancel()
// }
// async function removeView(viewPath) {
//   const res = await fetch(new URL(viewPath, endpoint), { method: 'DELETE' })
//   await res.body?.cancel()
// }

// async function createTab(view) {
//   const { active, index, openerTabId, pinned, url } = view
//   return await chrome.tabs.create({ active, index, pinned, url })
// }
// async function removeTab(tabId) {
//   await chrome.tabs.remove(tabId)
// }

// async function getMap(key) {
//   const kv = await chrome.storage.local.get(`${key}`)
//   const value = kv[`${key}`]
//   if (value === REMOVED) throw Error('removed.')
//   return value
// }
// async function setMap(key, value) {
//   await chrome.storage.local.set({ [`${key}`]: value, [`${value}`]: key })
// }
// async function removeMap(...keys) {
//   for (const key of keys) {
//     await chrome.storage.local.set({ [`${key}`]: REMOVED })
//   }
// }

// let count = 0
// views.addEventListener('change', async (ev) => {
//   if (!ev.data.startsWith(path)) return
//   console.log('>>change')
//   const key = ev.data
//   const res = await fetch(new URL(key, endpoint), { headers: { accept: 'application/json' } })
//   const view = await res.json()
//   const kv = await chrome.storage.local.get(key)
//   const id = kv[key]
//   if (id) {
//     console.log('update', id, view)
//     const tab = await updateTab(id, view)
//     console.log('updated', id, tab)
//   } else {
//     console.log('create', key, view)
//     if (count++ > 3) return console.error('max repeat.')
//     const { active, index, openerTabId, pinned, url } = view
//     const tab = await chrome.tabs.create({ active, index, pinned, url })
//     await chrome.storage.local.set({ [key]: tab.id, [`${tab.id}`]: key })
//     console.log('created', id, tab)
//   }
//   console.log('<<change')
// })
// views.addEventListener('remove', async (ev) => {
//   if (!ev.data.startsWith(path)) return
//   const id = ev.data.slice(path.length + 1)
//   try {
//     await chrome.tabs.remove(parseInt(id))
//   } catch (err) {
//     console.log('delete to link', err)
//     const kv = await chrome.storage.session.get(id)
//     if (id in kv) chrome.tabs.remove(kv[id])
//     await chrome.storage.session.remove(id)
//   }
// })

// async function updateView(tabId, tab) {
//   console.log('>>updateView')
//   console.log('update map, view <-> tab', tabId)
//   const kv = await chrome.storage.local.get(`${tabId}`)
//   if (!kv[tabId]) await chrome.storage.local.set({ [`${tabId}`]: `${path}/${tabId}` })
//   await chrome.storage.local.set({ [`${path}/${tabId}`]: tabId })
//   console.log('use map', tabId, kv[tabId])

//   const res = await fetch(kv[tabId] ? new URL(kv[tabId], endpoint) : `${endpoint}/${tabId}`, {
//     method: 'PUT',
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify(tab)
//   })
//   await res.body?.cancel()
//   console.log('<<updateView')
// }
// async function removeView(id) {
//   const res = await fetch(`${endpoint}/${id}`, { method: 'DELETE' })
//   await res.body?.cancel()
// }


// chrome.action.onClicked.addListener(function (tab) {
//   chrome.debugger.attach({ tabId: tab.id }, '1.2', function () {
//     const timer = setInterval(() => {
//       chrome.debugger.sendCommand({ tabId: tab.id }, "Input.dispatchMouseEvent", {
//         type: 'mouseWheel',
//         x: 100,
//         y: 100,
//         deltaX: 0,
//         deltaY: 3
//       }, function () {
//         if (chrome.runtime.lastError) {
//           console.error(chrome.runtime.lastError);
//         }
//         console.log('done')
//       })
//     }, 3000)
//     setTimeout(() => clearTimeout(timer), 10000)
//   })
// });

// chrome.debugger.onEvent.addListener(function (source, method, params) {
//   if (method === 'Network.responseReceived') {
//     console.log('Response received:', params.response);
//     // Perform your desired action with the response data
//   }
// });

// async function attach() {
//   const targets = await new Promise((r) => chrome.debugger.getTargets(r))
//   console.log(targets)
// }
