// events/files -> events/index.jsonl
import { existsSync, createReadStream, appendFileSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

const dir = './data/events'
const file = join(dir, 'index.jsonl')

if (!existsSync(file)) {
  console.error(`Error: ${file} not found.`)
  process.exit()
}

const rl = createInterface(createReadStream(file))
rl.on('line', (line) => {
  const { id, date, ...event } = JSON.parse(line)
  appendFileSync(join(dir, 'index.jsonl2'), JSON.stringify({ id, date, event }) + '\n')
})
rl.on('close', () => {
  rmSync(file)
  renameSync(join(dir, 'index.jsonl2'), file)
  console.log('done')
})
