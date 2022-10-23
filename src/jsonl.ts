import { access, appendFile, mkdir, stat, rm, rename } from 'node:fs/promises'
import { constants, createReadStream, createWriteStream } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { replacer } from './content'
import { FileEvent, updateFile } from './file'

export async function appendItem<T = unknown>(ev: { path: string; item: T }): Promise<void> {
  const { path, item } = ev
  try {
    await access(path, constants.O_APPEND)
  } catch {
    await mkdir(dirname(path), { recursive: true })
  }
  await appendFile(path, JSON.stringify(item, replacer) + '\n')
}

function changer(newFile: string) {
  return new Promise<void>((resolve, reject) => {
    const rl = createInterface(createReadStream(path))
    const w = createWriteStream(newFile)
    let updated = false
    rl.on('line', (line) => (match(JSON.parse(line)) ? (updated = true) : w.write(line + '\n')))
    rl.on('close', () => {
      updated && w.write(JSON.stringify(item) + '\n')
      w.close()
      updated ? resolve() : reject()
    })
  })
}

export async function updateItem<T = unknown>(ev: {
  path: string
  item: T
  resolver?: (item: T) => boolean
}): Promise<FileEvent> {
  const { path, item, resolver } = ev
  const match = resolver || ((v) => v === item)
  const changer = (newFile: string) =>
    new Promise<void>((resolve, reject) => {
      const rl = createInterface(createReadStream(path))
      const w = createWriteStream(newFile)
      let updated = false
      rl.on('line', (line) => (match(JSON.parse(line)) ? (updated = true) : w.write(line + '\n')))
      rl.on('close', () => {
        updated && w.write(JSON.stringify(item) + '\n')
        w.close()
        updated ? resolve() : reject()
      })
    })
  return await updateFile({ file: path, changer })
}

export async function updateOrAppendItem(...args: Parameters<typeof updateItem>) {
  try {
    await updateItem(...args)
    return 'updated'
  } catch {
    await appendItem(...args)
    return 'appended'
  }
}
