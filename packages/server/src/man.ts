import { fetch } from "./client";
import { EventEmitter } from "node:events";
import EventSource from "eventsource";

class Manager extends EventEmitter {
  url = new URL(process.env.DANMAID || "https://danmaid.com");
  events: EventSource;

  constructor(path?: string);
  constructor(url?: string);
  constructor(location?: string) {
    super();
    if (location) {
      const l = !location.endsWith("/") ? location + "/" : location;
      if (l.startsWith("http")) this.url.href = l;
      else this.url.pathname = l;
    }
    const events = new EventSource(this.url.toString());
    events.addEventListener("POST", (ev) => this.emit("created", ev.data));
    events.addEventListener("PUT", (ev) => this.emit("updated", ev.data));
    events.addEventListener("DELETE", (ev) => this.emit("deleted", ev.data));
    this.events = events;
  }

  async create(): Promise<{ id: string; url: string }> {}
  async update(): Promise<void> {}
  async delete(): Promise<void> {}
}

export class ManagedSet<T> extends Set<T> {
  map = new Map<string, T>();

  add(value: T): this {
    if (super.has(value)) {
      fetch(this.url, { method: "PUT" });
    } else {
      fetch(this.url, { method: "POST" }).then(async (res) => {
        if (res.statusCode !== 201) throw Error("status code !== 201");
        const id = await res.text();
        const url = res.headers.location;
        if (!url) throw Error("Location header is not found.");
      });
    }
    return super.add(value);
  }

  delete(value: T): boolean {
    fetch(this.url, { method: "DELETE" });
    return super.delete(value);
  }
}
