import fetch from 'node-fetch'
import { Server } from '../src'
import { getUrl, startServer } from './utils'

const server = new Server()
startServer(server)

let url: string
beforeAll(async () => (url = getUrl(server.address())))

describe('未処理分', () => {
  const include = [{}, { payments: undefined }, { payments: null }, { payments: '' }]
  const exclude = [{ payments: 'id' }, { payments: ['id1', 'id2'] }, { payments: [{}, {}] }, { payments: [] }]
  it.each(include)('対象ロジック検証 %s', async (item) => {
    expect(!item.payments).toBeTruthy()
  })

  it.each(exclude)('除外ロジック検証 %s', async (item) => {
    expect(!item.payments).toBeFalsy()
  })

  let size = 0
  it('GET /receipts -> 200', async () => {
    const res = await fetch(url + `/receipts`, { headers: { Accept: 'application/json' } })
    expect(res.status).toBe(200)
    const data: { payments?: unknown }[] = await res.json()
    expect(data).toBeInstanceOf(Array)
    expect(data.length).toBeGreaterThan(0)
    expect(data).toContainEqual(expect.not.objectContaining({ payments: expect.anything() }))
    const filtered = data.filter((v) => !v.payments)
    size = filtered.length
    expect(size).toBeGreaterThan(0)
  })

  it('GET /receipts?payments= -> 200', async () => {
    const res = await fetch(url + `/receipts?payments=`, { headers: { Accept: 'application/json' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeInstanceOf(Array)
    expect(data).toHaveLength(size)
    expect(data).toContainEqual(expect.not.objectContaining({ payments: expect.anything() }))
  })
})
