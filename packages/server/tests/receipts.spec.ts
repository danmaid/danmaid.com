import fetch from 'node-fetch'
import { Server } from '../src'
import { getUrl, startServer } from './utils'
import { createReadStream, Stats, ReadStream } from 'node:fs'
import { stat, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const server = new Server()
startServer(server)

let url: string
beforeAll(async () => (url = getUrl(server.address())))

describe('基本操作', () => {
  let file: Stats & { path: string; stream: ReadStream; hash: string; type: string }
  beforeAll(async () => {
    const path = join(__dirname, 'sample.jpg')
    const stats = await stat(path)
    const stream = createReadStream(path)
    stream.on('error', (err) => console.error(err))
    const data = await readFile(path)
    const hash = createHash('sha256').update(data).digest('hex')
    file = { ...stats, path, stream, hash, type: 'image/jpg' }
  })

  let id: string
  it('POST /receipts -> 201 ID', async () => {
    const res = await fetch(url + '/receipts', {
      method: 'POST',
      headers: { 'Content-Type': file.type, 'Content-Length': `${file.size}` },
      body: file.stream,
    })
    expect(res.status).toBe(201)
    expect(res.ok).toBe(true)
    expect(res.headers.get('Content-Type')).toMatch('json')
    id = await res.json()
    expect(id).toStrictEqual(expect.any(String))
  })

  it('保存されていること', async () => {
    const path = join('./data/receipts', id)
    const stats = await stat(path)
    expect(stats.size).toBe(file.size)
    const data = await readFile(path)
    const hash = createHash('sha256').update(data).digest('hex')
    expect(hash).toBe(file.hash)
    const index = JSON.parse(await readFile('./data/receipts/index.json', 'utf-8'))
    expect(index).toContainEqual(
      expect.objectContaining({ id, 'content-type': file.type, 'content-length': `${file.size}` })
    )
  })

  it('GET /receipts/:id -> 200', async () => {
    const res = await fetch(url + `/receipts/${id}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe(`${file.type}`)
    const data = await res.buffer()
    const hash = createHash('sha256').update(data).digest('hex')
    expect(hash).toBe(file.hash)
  })

  it('GET /receipts -> 200', async () => {
    const res = await fetch(url + `/receipts`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toContainEqual(expect.objectContaining({ id }))
  })

  it('GET /receipts/:id application/json -> 200', async () => {
    const res = await fetch(url + `/receipts/${id}`, { headers: { Accept: 'application/json' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch('application/json')
    const data = await res.json()
    expect(data).toMatchObject({ 'content-type': file.type })
  })

  it('PATCH /receipts/:id -> 200', async () => {
    const res = await fetch(url + `/receipts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payments: 'hoge' }),
    })
    expect(res.status).toBe(200)
  })

  it('GET /receipts/:id application/json -> 200', async () => {
    const res = await fetch(url + `/receipts/${id}`, { headers: { Accept: 'application/json' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch('application/json')
    const data = await res.json()
    expect(data).toMatchObject({ payments: 'hoge' })
  })

  it('GET /receipts -> 200', async () => {
    const res = await fetch(url + `/receipts`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toContainEqual(expect.objectContaining({ payments: 'hoge' }))
  })
})
