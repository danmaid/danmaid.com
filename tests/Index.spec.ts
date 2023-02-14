import { Server } from '../src/Server'
import fetch, { Headers } from 'node-fetch'
import { rm } from 'node:fs/promises'

const dir = './data/index'
const server = new Server(undefined, { dir })
let url: string
beforeAll(async () => {
  await rm(dir, { recursive: true }).catch(() => {})
  const port = await server.start()
  url = `http://localhost:${port}`
})
afterAll(async () => await server.stop())

const headers = new Headers({ 'Content-Type': 'application/json' })
async function put(path: string, payload: unknown) {
  return fetch(url + path, { method: 'PUT', headers, body: JSON.stringify(payload) })
}
async function get(path: string) {
  return fetch(url + path)
}

describe('herarchy', () => {
  it('GET /xxx/yyy/index.json -> 404', async () => {
    const res = await get('/xxx/yyy/index.json')
    expect(res.status).toBe(404)
  })

  it('GET /xxx/index.json -> 404', async () => {
    const res = await get('/xxx/index.json')
    expect(res.status).toBe(404)
  })

  it('GET /index.json -> 404', async () => {
    const res = await get('/index.json')
    expect(res.status).toBe(404)
  })

  it("PUT /xxx/yyy/zzz { x: 'x', y: 'y', z: 'z' } -> 200", async () => {
    const res = await put('/xxx/yyy/zzz', { x: 'x', y: 'y', z: 'z' })
    expect(res.status).toBe(200)
  })

  it("GET /xxx/yyy/index.json -> 200 contain('zzz')", async () => {
    const res = await get('/xxx/yyy/index.json')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toContain('zzz')
  })

  it("GET /xxx/index.json -> 200 contain('yyy')", async () => {
    const res = await get('/xxx/index.json')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toContain('yyy')
  })

  it("GET /index.json -> 200 contain('xxx')", async () => {
    const res = await get('/index.json')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toContain('xxx')
  })
})

describe('alias', () => {
  it("PUT /xx/yy { x: 'x', y: 'y' } -> 200", async () => {
    const res = await put('/xx/yy', { x: 'x', y: 'y' })
    expect(res.status).toBe(200)
  })

  let xx: { body: string; etag: string | null }
  it('GET /xx/index.json -> 200', async () => {
    const res = await get('/xx/index.json')
    expect(res.status).toBe(200)
    xx = { body: await res.text(), etag: res.headers.get('ETag') }
    expect(xx.body).toBeDefined()
    expect(xx.etag).toBeDefined()
  })

  it('GET /xx/ == /xx/index.json', async () => {
    const res = await get('/xx/')
    expect(res.headers.get('ETag')).toBe(xx.etag)
    const body = await res.text()
    expect(body).toBe(xx.body)
  })

  it('GET /xx == /xx/index.json', async () => {
    const res = await get('/xx')
    expect(res.headers.get('ETag')).toBe(xx.etag)
    const body = await res.text()
    expect(body).toBe(xx.body)
  })

  let root: { body: string; etag: string | null }
  it('GET /index.json -> 200', async () => {
    const res = await get('/index.json')
    expect(res.status).toBe(200)
    root = { body: await res.text(), etag: res.headers.get('ETag') }
    expect(root.body).toBeDefined()
    expect(root.etag).toBeDefined()
  })

  it('GET / == /index.json', async () => {
    const res = await get('/')
    expect(res.headers.get('ETag')).toBe(root.etag)
    const body = await res.text()
    expect(body).toBe(root.body)
  })
})
