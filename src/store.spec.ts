import { Store } from './store'
import { rm, readdir } from 'node:fs/promises'

it('1st init', async () => {
  await rm('./data', { recursive: true }).catch(() => {})
  const store = new Store()
  expect(store).toBeInstanceOf(Store)
  expect(store.current).toHaveProperty('maxSize')
  expect(store.current).toHaveProperty('size')
  expect(store.current).toHaveProperty('path')
  await expect(readdir('./data')).resolves.toHaveLength(1)
  await expect(store.filter(() => true)).resolves.toStrictEqual([])
  const id = await store.add({})
  expect(id).toMatch(/^[\w-]+$/)
  const items = await store.filter(() => true)
  expect(items).toHaveLength(1)
  expect(items).toContainEqual(expect.objectContaining({ id }))
  const item = await store.get(id)
  expect(item).toMatchObject({ id })
  await expect(store.get('not found')).rejects.toThrowError()
})

it('2nd init', async () => {
  new Store()
  await expect(readdir('./data')).resolves.toHaveLength(1)
})

it('switch index file', async () => {
  const store = new Store()
  store.current.maxSize = 1
  await expect(readdir('./data')).resolves.toHaveLength(1)
  const id = await store.add({})
  expect(id).toMatch(/^[\w-]+$/)
  const items = await store.filter(() => true)
  expect(items).toHaveLength(2)
  expect(items).toContainEqual(expect.objectContaining({ id }))
  const item = await store.get(id)
  expect(item).toMatchObject({ id })
  await expect(readdir('./data')).resolves.toHaveLength(2)
})
