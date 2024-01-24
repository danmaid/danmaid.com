import { join, dirname } from "https://deno.land/std@0.212.0/path/mod.ts";

const dataDir = "./data";
const headerExt = ".header.json";

export async function save(path: string, meta: unknown, body?: ReadableStream) {
  const filePath = join(dataDir, path);
  await Deno.mkdir(dirname(filePath), { recursive: true });
  if (body) {
    const file = await Deno.open(filePath, {
      write: true,
      truncate: true,
      create: true,
    });
    await body.pipeTo(file.writable);
  }
  await Deno.writeTextFile(filePath + headerExt, JSON.stringify(meta));
}

export async function load(
  path: string,
  withBody = true
): Promise<{ meta: any; body?: ReadableStream | null }> {
  const filePath = join(dataDir, path);
  const text = await Deno.readTextFile(filePath + headerExt);
  const meta = JSON.parse(text);
  if (!withBody) return { meta };

  const stat = await Deno.stat(filePath);
  if (stat.isDirectory) return { meta, body: null };
  const file = await Deno.open(filePath, { read: true });
  return { meta, body: file.readable };
}
