import fetch from 'node-fetch'
import { SimpleServer } from '../src/SimpleServer'

const server = new SimpleServer()
let url: string
beforeAll(async () => (url = `http://localhost:${await server.start()}`))
afterAll(async () => await server.stop())

const sensor = '810A0000'
const event = { type: 'sensed', temperature: 25.6, humidity: 41.46, magnet: 'open' }
it('PATCH /sensors/:id -> 200', async () => {
  const res = await fetch(url + `/sensors/${sensor}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
  expect(res.status).toBe(200)
})

it('GET /sensors/:id -> 200 sensor', async () => {
  const res = await fetch(url + `/sensors/${sensor}`, { headers: { accept: 'application/json' } })
  expect(res.status).toBe(200)
  expect(res.ok).toBe(true)
  expect(res.headers.get('Content-Type')).toMatch('json')
  const data = await res.json()
  expect(data).toMatchObject(event)
})

it('GET /sensors -> 200 contain({id})', async () => {
  const res = await fetch(url + '/sensors', { headers: { accept: 'application/json' } })
  expect(res.status).toBe(200)
  expect(res.ok).toBe(true)
  expect(res.headers.get('Content-Type')).toMatch('json')
  const data = await res.json()
  expect(data).toContainEqual(expect.objectContaining({ id: sensor }))
})
