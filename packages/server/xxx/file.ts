import { dirname } from "https://deno.land/std@0.212.0/path/dirname.ts";
import { join } from "https://deno.land/std@0.212.0/path/join.ts";

const dataDir = './data'

export async function load(path: string): Promise<ReadableStream> {
  const file = await Deno.open(join(dataDir, path), { read: true })
  return file.readable
}

export async function save(path: string, data: ReadableStream): Promise<Response> {
  const filepath = join(dataDir, path);
  await Deno.mkdir(dirname(filepath), { recursive: true })
  const file = await Deno.open(filepath, { write: true, truncate: true, create: true })
  await data.pipeTo(file.writable)
  return new Response()
}

export async function remove(path: string): Promise<void> {
  const filepath = join(dataDir, path);
  await Deno.remove(filepath)
}
