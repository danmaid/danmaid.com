export default async function (req: Request): Promise<Response> {
  if (!req.body) return new Response(null, { status: 400 });
  const stream = req.body;
  const reader = stream.getReader();

  let header = "";
  async function read() {
    const { done, value } = await reader.read();
    if (value) {
      const x = new TextDecoder().decode(value);
      const y = x.indexOf("\r\n\r\n");
      if (y >= 0) {
        header += x.slice(0, y);
        const body = value.slice(y + 4);
        reader.releaseLock();
        return stream.pipeThrough(
          new TransformStream({ start: (ctrl) => ctrl.enqueue(body) })
        );
      }
      header += x;
    }
    if (!done) return read();
    return null;
  }
  const body = await read();

  const lines = header.split("\r\n");
  const entries: [string, string][] = [];
  for (const line of lines) {
    if (line.match(/^[ \t]/)) {
      entries[entries.length - 1][1] += line;
      continue;
    }
    const [name, body] = line.split(":");
    entries.push([name, body.trimStart()]);
  }
  const headers = Object.fromEntries(entries);
  console.log(header, body);

  return new Response(body, { headers });
}
