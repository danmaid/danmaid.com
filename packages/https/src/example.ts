import { createCertificate } from "./cert";

import("https").then(async (m) => {
  const cert = await createCertificate("dev.danmaid.com");
  const server = m.createServer({ ...cert });
  server.on("request", (req, res) => res.end());
  server.on("request", (req, res) =>
    console.log(`${req.method} ${req.url} => ${res.statusCode}`)
  );
  await new Promise<void>((r) => server.listen(443, r));
  console.log("https started.");
});
