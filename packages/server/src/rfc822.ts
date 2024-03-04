import { ReadableStream, TransformStream } from "node:stream/web";

// message/rfc822 => header, body
export async function decode(stream: ReadableStream<Uint8Array>): Promise<{
  headers: Record<string, string>;
  body: ReadableStream<Uint8Array> | null;
}> {
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

  const headers: Record<string, string> = {};
  const fields: string[] = header
    .split("\r\n") // section 2.1
    // section 2.2.3
    .reduce<string[]>((p, c) => {
      if (/^[ \t]/.test(c)) p[p.length - 1] += c;
      else p.push(c);
      return p;
    }, []);

  for (const field of fields) {
    // section 2.2
    const name = field.match(/^([\x21-\x39\x3b-\x7e]+):/)?.[1];
    // section 2.2.1 -> 3.2.5
    const body = field.match(/:[\x20\x09]+([\x20-\x7e\x09]+)$/)?.[1];
    if (name && body) {
      headers[name] = headers[name] ? headers[name] + body : body;
    }
  }

  return { headers, body };
}
