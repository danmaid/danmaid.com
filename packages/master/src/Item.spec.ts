import { it, expect, beforeAll } from '@jest/globals'
import { getItem } from './Item'
import { server } from './test-server'

beforeAll(async () => {
  server.on('request', (req, res) => {
    res.end(JSON.stringify({ x: '', y: 0, z: false }))
  })
})

it('empty', async () => {
  const x = getItem('xxx')
  expect(x).toStrictEqual({ indeterminate: true })
  expect(x.indeterminate).toBe(true)
})

it('with init', async () => {
  const x = getItem('aaa', { a: 'a', b: 0, c: true })
  expect(x).toStrictEqual({ a: 'a', b: 0, c: true, indeterminate: true })
})

it('loaded', async () => {
  const x = getItem('yyy')
  expect(x.indeterminate).toBe(true)
  expect(x).toStrictEqual({ indeterminate: true })
  await new Promise(r => x.addEventListener('change', r))
  expect(x.indeterminate).toBe(false)
  expect(x).toStrictEqual({ x: '', y: 0, z: false })
})

it('loaded with init', async () => {
  const x = getItem('zzz', { x: 'xx', y: 'yy', z: 'zz' })
  expect(x.indeterminate).toBe(true)
  expect(x).toStrictEqual({ x: 'xx', y: 'yy', z: 'zz', indeterminate: true })
  await new Promise(r => x.addEventListener('change', r))
  expect(x.indeterminate).toBe(false)
  expect(x).toStrictEqual({ x: '', y: 0, z: false })
})

it('set', async () => {
  const x = getItem<{ xx: string }>('xxx')
  expect(x).toStrictEqual({ indeterminate: true })
  expect(x.indeterminate).toBe(true)
  x.set({ xx: 'xx' })
  expect(x).toStrictEqual({ xx: 'xx', indeterminate: true })
})
