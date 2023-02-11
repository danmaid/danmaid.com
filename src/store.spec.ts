import store, { Store } from './store'
import { access } from 'node:fs/promises'

const load = jest.spyOn(Store.prototype, 'load')

beforeEach(async () => jest.clearAllMocks())

it('default export', async () => {
  expect(store).toBeInstanceOf(Store)
  await expect(store.ready).resolves.toBeUndefined()
  await expect(access(store.dir)).resolves.toBeUndefined()
})

it('', async () => {
  const store = new Store({ dir: './data/tests', cache: true })
  await expect(store.ready).resolves.toBeUndefined()
  expect(load).toBeCalled()
})

it('', async () => {
  const store = new Store({ dir: './data/tests' })
  await expect(store.ready).resolves.toBeUndefined()
  await expect(store.add({})).resolves.toStrictEqual({
    id: expect.any(String),
    date: expect.any(Date),
  })
})
