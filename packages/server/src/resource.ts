import { writeFile, readFile } from 'node:fs/promises'

export const queues = new Map<string, Promise<any>>()

export async function addIndex<T>(path: string, id: string, index: T): Promise<void> {
  const addIndex = (queues.get(path) || Promise.resolve()).then(async () => {
    const text = await readFile(path, 'utf-8').catch(() => '[]')
    const indexes: (T & { id: string })[] = JSON.parse(text)
    indexes.push({ ...index, id })
    await writeFile(path, JSON.stringify(indexes), 'utf-8')
  })
  queues.set(path, addIndex)
  await addIndex
}

export async function getIndex<T>(path: string, id: string): Promise<T & { id: string }> {
  const text = await readFile(path, 'utf-8')
  const indexes: (T & { id: string })[] = JSON.parse(text)
  const index = indexes.find((v) => v.id === id)
  if (!index) throw Error('index not found.')
  return index
}

export async function updateIndex<T>(path: string, id: string, index: T): Promise<void> {
  const updateIndex = (queues.get(path) || Promise.resolve()).then(async () => {
    const indexes: (T & { id: string })[] = JSON.parse(await readFile(path, 'utf-8').catch(() => '[]'))
    const i = indexes.findIndex((v) => v.id === id)
    if (i >= 0) indexes.splice(i, 1)
    indexes.push({ ...index, id })
    await writeFile(path, JSON.stringify(indexes), 'utf-8')
  })
  queues.set(path, updateIndex)
  await updateIndex
}

export async function removeIndex(path: string, id: string): Promise<void> {
  const removeIndex = (queues.get(path) || Promise.resolve()).then(async () => {
    const text = await readFile(path, 'utf-8')
    const indexes: { id: string }[] = JSON.parse(text)
    const i = indexes.findIndex((v) => v.id === id)
    if (i >= 0) {
      indexes.splice(i, 1)
      await writeFile(path, JSON.stringify(indexes), 'utf-8')
    }
  })
  queues.set(path, removeIndex)
  await removeIndex
}

export function createData() {}
export function updateData() {}
export function deleteData() {}

export function createItem() {}
export function updateItem() {}
export function deleteItem() {}
