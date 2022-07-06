import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { constants } from 'fs'
import { Store } from './Store'

export class FileStore<K, V> extends Store<K, V> {
  file = 'data/store.json'
  loading: Promise<void>

  constructor() {
    super()
    this.loading = Promise.resolve().then(async () => {
      await mkdir('data', { recursive: true })
    })
    this.load()
  }

  async get(key: K): Promise<V> {
    await this.loading
    return await super.get(key)
  }

  async set(key: K, value: V): Promise<void> {
    await this.loading
    this.items.set(key, value)
    await this.save()
  }

  async load(): Promise<void> {
    this.loading = this.loading
      .then(async () => {
        await access(this.file, constants.R_OK | constants.W_OK)
        const data = await readFile(this.file, { encoding: 'utf-8' })
        const items: [K, V][] = JSON.parse(data)
        this.items.clear()
        items.forEach(([k, v]) => this.items.set(k, v))
      })
      .catch(async () => {
        await writeFile(this.file, JSON.stringify([]), { encoding: 'utf-8' })
      })
    return this.loading
  }

  async save(): Promise<void> {
    this.loading = this.loading.then(async () => {
      const items = Array.from(this.items)
      await writeFile(this.file, JSON.stringify(items), { encoding: 'utf-8' })
    })
    return this.loading
  }
}
