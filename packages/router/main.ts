import { TextLineStream } from "https://deno.land/std@0.136.0/streams/mod.ts";

// see RFC9112
async function getRoute(readable: ReadableStream): Promise<"default" | "SSE"> {
  const lines = readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream());

  let version: number | undefined;
  // Request Line
  const reader = lines.getReader();
  const line = await reader.read();
  reader.releaseLock();
  if (!line.value) {
    lines.cancel();
    console.log("Request Line is not found.");
    return "default";
  }
  console.log("Request Line", line.value);
  const r = /^GET .* HTTP\/(\d[\d.]*)$/i.exec(line.value);
  if (!r) {
    console.log("Reqeust Line is not match.");
    return "default";
  }
  version = parseInt(r[1]);

  // Field lines
  for await (const line of lines) {
    console.log("Field Line", line);
    if (/^Accept: ?text\/event-stream ?$/i.test(line)) {
      console.log("Match SSE.");
      return "SSE";
    }
    if (line == "") break;
  }
  console.log("Field Lines is not match.");
  lines.cancel();
  return "default";
}

const listener = Deno.listen({ port: 6900 });
for await (const conn of listener) {
  console.log("connected.", conn.remoteAddr);
  const [a, b] = conn.readable.tee();

  const route = await getRoute(a);
  console.log("route", route);

  b.cancel();
  console.log("closed.");
}
