import { createServer } from "node:https";
import { readFile } from "node:fs/promises";
import { main, log } from "./handlers";
import { negotiation } from "./negotiation";

const port = 443;

const certFile = process.env.CERT_FILE;
const keyFile = process.env.KEY_FILE;

const server = createServer(async (req, res) => {
  log(req, res);
  try {
    if (req.method === "GET") {
      try {
        return await sendFile.call(res, req);
      } catch (err) {
        if (req.headers.accept) return await negotiation.call(res, req);
        throw err;
      }
    }
    if (req.method === "PUT") {
      if (req.headers["content-type"]) return await proxy.call(res, req);
      return await writeFile.call(res, req);
    }
    if (req.method === "DELETE") return await deleteFile.call(res, req);
    res.writeHead(501).end();
  } catch (err) {
    res.writeHead(404).end();
    console.warn(err);
  }
  await main(req, res);
  await negotiation.call(res, req);
});

async function start(retry = 10) {
  if (!certFile) throw Error("env CERT_FILE not found.");
  if (!keyFile) throw Error("env KEY_FILE not found.");
  try {
    const cert = await readFile(certFile);
    const key = await readFile(keyFile);
    server.setSecureContext({ cert, key });
    console.log("set. cert, key");
  } catch {
    await new Promise((r) => setTimeout(r, 3000));
    if (retry > 0) return start(retry - 1);
    throw Error("give up.");
  }

  await new Promise<void>((r) => server.listen(port, r));
  console.log("server started.");
}

start();
