// events/files -> events/index.jsonl
import { existsSync } from 'node:fs'
import { readdir, readFile, appendFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const dir = './data/events'
const file = join(dir, 'index.jsonl')

if (existsSync(file)) {
  console.error(`Error: ${file} found.`)
  process.exit()
}

Promise.resolve().then(async () => {
  const files = await readdir(dir)
  console.log('found files.', files.length)

  const r = files.map(async (id) => {
    const data = await readFile(join(dir, id), { encoding: 'utf-8' })
    const index = JSON.parse(data)
    return { ...index, id }
  })
  const indexes = await Promise.all(r)
  console.log('read files.', indexes.length)

  indexes.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0))
  console.log('sorted.', indexes.length)

  for (const index of indexes) {
    await appendFile(file, JSON.stringify(index) + '\n')
  }
  console.log('index.jsonl created.', indexes.length)

  const removed = await Promise.all(files.map((file) => rm(join(dir, file))))
  console.log('removed files.', removed.length)

  console.log('done.')
})
