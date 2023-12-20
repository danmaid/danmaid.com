import { randomUUID } from "node:crypto";
import { writeFile, open, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";

const dataDir = "data";

export async function add<T>(stream: Readable, meta: T): Promise<string> {
  const id = randomUUID();
  await writeFile(join(dataDir, id), stream);
  await writeFile(join(dataDir, id + ".meta"), JSON.stringify(meta), {
    encoding: "utf-8",
  });
  return id;
}

export async function get(id: string): Promise<Readable> {
  const fd = await open(join(dataDir, id));
  return fd.createReadStream();
}

export async function set(
  id: string,
  stream?: Readable,
  meta?: object
): Promise<void> {
  if (stream) await writeFile(join(dataDir, id), stream);
  if (meta) await writeFile(join(dataDir, id + ".meta"), JSON.stringify(meta));
}

export async function remove(id: string): Promise<void> {
  await rm(join(dataDir, id));
  await rm(join(dataDir, id + ".meta"));
}

export async function getMeta<T>(id: string): Promise<T> {
  const data = await readFile(join(dataDir, id + ".meta"), {
    encoding: "utf-8",
  });
  return JSON.parse(data);
}
