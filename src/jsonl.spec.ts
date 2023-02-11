import { Jsonl } from './jsonl'
import { access, rm } from 'node:fs/promises'

const file = './data/tests/index.jsonl'

it('ファイルが存在しないとき、作成すること', async () => {
  await access(file)
    .then(() => rm(file, { recursive: true }))
    .catch(() => {})
  await expect(access(file)).rejects.toThrowError('ENOENT')
  new Jsonl(file)
  await expect(access(file)).resolves.toBeUndefined()
})

it('', async () => {
  const jsonl = new Jsonl(file)
  await expect(jsonl.read()).resolves.toStrictEqual([])
})

it('', async () => {
  const jsonl = new Jsonl(file)
  await jsonl.append({})
  await expect(jsonl.read()).resolves.toStrictEqual([{}])
})
