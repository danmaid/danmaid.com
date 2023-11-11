import { randomUUID } from "node:crypto";
import { fetch } from "./client";
import EventSource from "eventsource";

export class Manager<T extends object & { close?(): void }> {
  items = new Map<T, string>();
  serializer;
  ids = new Map<string, T>();
  events: EventSource;

  constructor(public url: string, options?: { serializer?(item: T): unknown }) {
    this.serializer = options?.serializer;
    this.events = new EventSource(url.endsWith("/") ? url : url + "/");
    this.events.addEventListener("DELETE", (ev) => {
      console.log("DELETE event:", ev.data);
      this.ids.get(ev.data)?.close?.();
    });
  }

  async createItem(): Promise<string> {
    const res = await fetch(this.url, { method: "POST" });
    if (res.statusCode !== 201) throw Error("status code !== 201");
    if (!res.headers.location) throw Error("Location header not found.");
    return res.headers.location;
  }

  async add(item: T): Promise<string> {
    const url = await this.createItem();
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Link": `<${url}>`,
      },
      body: JSON.stringify(this.serializer ? this.serializer(item) : item),
    });
    this.items.set(item, id);
    this.ids.set(id, item);
    console.log(`added`, res.statusCode, id);
    return id;
  }

  async delete(item: T): Promise<boolean> {
    const id = this.getId(item);
    if (!id) return false;
    const res = await fetch(`${this.url}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    console.log(`deleted`, res.statusCode, id);
    this.items.delete(item);
    this.ids.delete(id);
    return true;
  }

  getId(item: T): string | undefined {
    return this.items.get(item);
  }
}
