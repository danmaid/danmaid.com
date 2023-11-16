import { IncomingMessage } from "node:http";
import { request } from "./client";

const manager = process.env.DANMAID || "https://danmaid.com";

export async function createItem(
  suffix = "/"
): Promise<{ id: string; url: string }> {
  if (!suffix.startsWith("/")) throw Error("suffix must start with '/'");
  if (!suffix.endsWith("/")) throw Error("suffix must end with '/'");
  const res = await new Promise<IncomingMessage>((resolve) => {
    request(manager + suffix, { method: "POST" }, resolve).end();
  });
  if (res.statusCode !== 201) throw Error("status code !== 201");
  if (!res.headers.location) throw Error("Location header not found.");
  let id = "";
  for await (const chunk of res) id += chunk;
  const url = res.headers.location;
  return { id, url };
}
