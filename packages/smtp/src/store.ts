import { randomUUID } from "node:crypto";
import { writeFile, open } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";

const dataDir = "data";

export async function add(stream: Readable, meta: object): Promise<string> {
  const id = randomUUID();
  await writeFile(join(dataDir, id), stream);
  await writeFile(join(dataDir, id + ".meta"), JSON.stringify(meta));
  return id;
}

export async function get(id: string): Promise<Readable> {
  const fd = await open(join(dataDir, id));
  return fd.createReadStream();
}
