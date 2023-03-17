it(`POST /request { title: 'x', description: 'xxx' } => 201 zzz`, async () => {
  const req: any = {}
  const { ip, ips, method, path, headers } = req
  const e = {
    ...headers,
    ip: '',
    ips: [],
    method: 'POST',
    path: '/request',

    event: 'eee', // value = 生成
    date: new Date(),

    request: 'zzz', // key = path から算出, value = POST && 生成

    title: 'x',
    description: 'xxx',
  }
})

it(`GET /request => 200 [{ id: 'zzz', title: 'x', description: 'xxx' }]`, async () => {
  const store: any[] = []
  const map = new Map()
  for (const v of store) {
    if (!v.request || v.method === 'GET' || v.method === 'HEAD') continue
    const before = map.get(v.request)
    map.delete(v.request)
    if (v.method === 'PUT' || v.method === 'POST') map.set(v.request, v)
    else if (v.method === 'PATCH') map.set(v.request, { ...before, ...v })
  }
  const xyz = Array.from(map.entries()).map(([id, v]) => ({ ...v, id }))
  return xyz
})
it(`GET /request/zzz => 200 { title: 'x', description: 'xxx' }`, async () => {
  const store: any[] = []
  let xyz
  for (const v of store) {
    if (!v.request || v.request !== 'zzz' || v.method === 'GET' || v.method === 'HEAD') continue
    if (v.method === 'PUT' || v.method === 'POST') xyz = v
    else if (v.method === 'PATCH') xyz = { ...xyz, ...v }
    else if (v.method === 'DELETE') xyz = undefined
  }
  return xyz
})
it.todo(`GET / => 200 [{ request: 'zzz', event: 'eee' }]`)
it.todo(`GET /event => 200 [{ id: 'eee', date: Date }]`)
it.todo(`GET /event/eee => 200 { date: Date }`)
