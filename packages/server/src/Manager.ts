import { randomUUID } from "node:crypto";
import { fetch } from "./client";

export class Manager<T> {
  ids = new Map<T, string>();
  serializer;
  constructor(public url: string, options?: { serializer?(item: T): unknown }) {
    this.serializer = options?.serializer;
  }

  async add(item: T): Promise<string> {
    const id = randomUUID();
    const res = await fetch(`${this.url}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.serializer ? this.serializer(item) : item),
    });
    this.ids.set(item, id);
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
    this.ids.delete(item);
    return true;
  }

  getId(item: T): string | undefined {
    return this.ids.get(item);
  }
}
