import fetch from 'node-fetch'
import { Server } from '../src'
import { getUrl, startServer } from './utils'

const server = new Server()
startServer(server)

let url: string
beforeAll(async () => (url = getUrl(server.address())))

it('GET /sensors', async () => {
  const res = await fetch(url + '/sensors', { headers: { accept: 'application/json' } })
  expect(res.ok).toBe(true)
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toMatch('json')
  const data = await res.json()
  expect(data).toBeInstanceOf(Array)
})

const sensor = '810A0000'
const event = { type: 'sensed', temperature: 25.6, humidity: 41.46, magnet: 'open' }
it('POST /sensors/:id/events -> 200', async () => {
  const res = await fetch(url + `/sensors/${sensor}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(event),
  })
  expect(res.status).toBe(200)
  expect(res.ok).toBe(true)
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
