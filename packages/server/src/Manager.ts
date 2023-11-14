import { fetch } from "./client";
import EventSource from "eventsource";
import { console } from "./ManagedServer";

export interface Manageable {
  id?: string;
  on(event: "updated", listener: () => void): void;
  on(event: "deleted", listener: () => void): void;
  toJSON?(key?: string): unknown;
  delete?(): void;
}

export class Manager<T extends Manageable> extends Map<string, T> {
  constructor(readonly url: string) {
    super();
    const events = new EventSource(url);
    events.addEventListener("DELETE", (ev) => this.delete(ev.data));
  }

  async add(item: T, path = "") {
    const res = await fetch(this.url + path, { method: "POST" });
    if (res.statusCode !== 201) throw Error("status code !== 201");
    const url = res.headers.location;
    if (!url) throw Error("Location header is not found.");
    const id = await res.text();

    const toJSON = item.toJSON;
    Object.assign(item, {
      toString: () => `[${item.constructor.name} ${id}]`,
      toJSON: (key: string) =>
        key ? id : toJSON ? toJSON.call(item, key) : item,
    });
    fetch(url, { method: "PUT", body: JSON.stringify(item) });

    item.on("updated", () => {
      fetch(url, { method: "PUT", body: JSON.stringify(item) });
      console.log("[updated] %s %j", item, item);
    });
    item.on("deleted", () => {
      fetch(url, { method: "DELETE" });
      console.log("[deleted] %s %j", item, item);
    });
    console.log("[created] %s %j", item, item);
    this.set(id, item);
  }

  delete(key: string): boolean {
    const item = this.get(key);
    if (!item) return false;
    item.delete?.();
    return super.delete(key);
  }
}
