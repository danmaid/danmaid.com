// events/files -> events/index.jsonl
import { existsSync, createReadStream, appendFileSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

const dir = './data/events'
const src = join(dir, 'index.jsonl')
const temp = join(dir, 'index.jsonl2')

if (!existsSync(src)) {
  console.error(`Error: ${src} not found.`)
  process.exit()
}

const rl = createInterface(createReadStream(src))
rl.on('line', (line) => {
  const e = JSON.parse(line)
  if ('event' in e) {
    appendFileSync(temp, line + '\n')
  } else {
    const { id, date, ...event } = e
    appendFileSync(temp, JSON.stringify({ id, date, event }) + '\n')
  }
})
rl.on('close', () => {
  rmSync(src)
  renameSync(temp, src)
  console.log('done')
})
