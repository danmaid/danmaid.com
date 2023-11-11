import { PassThrough } from "node:stream";
import EventSource from "eventsource";
import { fetch } from "./client";

const host = "localhost:6900";
const queue = new PassThrough({ objectMode: true });

async function listen() {
  for await (const [action, url] of queue) {
    console.log(">>index", url);
    const regexp = /([^/]+)$/;
    const id = url.match(regexp)?.[1];
    if (!id || id === "index.json") continue;
    const indexUrl = `http://${host}/` + url.replace(regexp, "index.json");
    const res = await fetch(indexUrl);
    const init = res.statusCode === 200 ? await res.json<string[]>() : [];
    const index = new Set(init);
    if (index.has(id)) continue;
    action === "set" ? index.add(id) : index.delete(id);
    if (index.size > 0) {
      await fetch(indexUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Array.from(index)),
      });
    } else await fetch(indexUrl, { method: "DELETE" });

    console.log("<<index");
  }
}

export default async function start() {
  const events = new EventSource(`http://${host}/`);
  events.addEventListener("PUT", (ev) => queue.push(["set", ev.data]));
  events.addEventListener("DELETE", (ev) => queue.push(["delete", ev.data]));
  events.addEventListener("POST", (ev) => queue.push(["set", ev.data]));
  listen();
}
