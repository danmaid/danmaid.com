import * as path from "https://deno.land/std@0.208.0/path/mod.ts";

const baseUrl = Deno.env.get("BASE_URL") || "https://dev.danmaid.com";
const baseDir = "./data";
const typeMap = new Map([
  [".html", "text/html"],
  [".css", "text/css"],
  [".js", "text/javascript"],
  [".mjs", "text/javascript"],
]);

console.log("from", baseDir);
console.log("to", baseUrl);

for await (const x of Deno.readDir("./modules")) {
  if (!x.isDirectory) continue;
  const dir = path.join("./modules", x.name);
  for await (const y of Deno.readDir(dir)) {
    if (!y.isFile || !(await isUpdated(y))) continue;
    await Deno.copyFile(path.join(dir, y.name), path.join(baseDir, y.name));
  }
}

for await (const x of Deno.readDir(baseDir)) {
  console.log(x.name);
  if (x.isFile && (await isUpdated(x))) update(x);
}

async function isUpdated(x: Deno.DirEntry): Promise<boolean> {
  console.log("update check logic is not implemented. now to be allways true.");
  return true;
}

async function update(x: Deno.DirEntry): Promise<void> {
  const file = await Deno.open(path.join(baseDir, x.name));
  const options: RequestInit = { method: "PUT", body: file.readable };
  if (!(await hasHeader(x))) {
    const type = typeMap.get(path.extname(x.name));
    if (type) options.headers = { "content-type": type };
  }
  const res = await fetch(new URL(x.name, baseUrl), options);
  console.log(x.name, res.status, res.statusText);
}

async function hasHeader(x: Deno.DirEntry): Promise<boolean> {
  try {
    await Deno.stat(path.join(baseDir, x.name + ".header.json"));
    return true;
  } catch {
    return false;
  }
}
