import { post } from './generic'
import fs, { readFile } from 'node:fs/promises'
import { Response } from 'express'

describe('', () => {
  let id: string
  it('', async () => {
    const writeFile = jest.spyOn(fs, 'writeFile')
    const req = { path: '/xxx', body: { yyy: 'zzz' } }
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((data) => {
        id = data
        return res
      }),
    } as Partial<Response>
    const next = jest.fn()
    await expect(post(req as any, res as any, next as any)).resolves.toBeUndefined()
    expect(id).toMatch(/^[\w-]+$/)

    const content = JSON.parse(await readFile(`data/contents/${id}`, { encoding: 'utf-8' }))
    expect(content).toStrictEqual({ yyy: 'zzz' })

    const xxx = JSON.parse(await readFile('data/xxx/index.json', { encoding: 'utf-8' }))
    expect(xxx).toContainEqual({ yyy: 'zzz', id })

    await new Promise((r) => setTimeout(r, 1000))
    const yyy: any[] = JSON.parse(await readFile('data/yyy/index.json', { encoding: 'utf-8' }))
    expect(yyy).toContainEqual(expect.objectContaining({ id: 'zzz' }))
    const zzz = yyy.find((v) => v.id === 'zzz')
    typeof zzz.xxx === 'string' ? expect(zzz.xxx).toBe(id) : expect(zzz.xxx).toContain(id)

    const global = JSON.parse(await readFile('data/index.json', { encoding: 'utf-8' }))
    expect(global).toContain({ id: 'xxx' })
    expect(global).toContain({ id: 'yyy' })
    expect(global).toContain({ id: 'contents' })
    expect(global).toContain({ id: 'events' })
  })
})
