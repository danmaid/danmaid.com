import { Readable } from 'node:stream'

export function replacer(k: string, v: unknown): unknown {
  return v instanceof Readable ? '[object Readable]' : v
}
