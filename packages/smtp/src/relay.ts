import { createTransport } from "nodemailer";
import http2 from "node:http2";

const hosts = [
  // [{ host: "localhost", port: 25 }],
  [
    { host: "aspmx.l.google.com", port: 25 },
    { host: "aspmx2.googlemail.com", port: 25 },
    { host: "aspmx3.googlemail.com", port: 25 },
    { host: "alt1.aspmx.l.google.com", port: 25 },
    { host: "alt2.aspmx.l.google.com", port: 25 },
  ],
];

const client = http2.connect("https://danmaid.com");
// const client = http2.connect("https://localhost", {
//   rejectUnauthorized: false,
// });
setInterval(() => client.ping((err, dur) => console.log(err, dur)), 30000);
const req = client.request({ accept: "text/event-stream" });
req.on("response", (headers) => {
  if (headers[":status"] !== 200) throw Error("invalid :status");
  if (headers["content-type"] !== "text/event-stream")
    throw Error("invalid content-type");
  req.setEncoding("utf-8");
  let data = "";
  req.on("data", (chunk: string) => {
    console.log("chunk", chunk);
    data += chunk;
    if (data.includes("\n\n")) {
      const [t, r] = data.split("\n\n");
      data = r;
      const e = Object.fromEntries(
        t.split("\n").map((v) => v.split(":").map((v) => v.trim()))
      );
      if (e.event === "PUT") exec(e.data);
    }
  });
});

async function exec(url: string) {
  console.log("exec", url);
  const req = client.request({ ":path": url });
  req.on("response", (headers) => {
    if (headers["content-type"] !== "message/rfc822") return req.close();
    let message = "";
    req.setEncoding("utf-8");
    req.on("data", (chunk) => (message += chunk));
    req.on("end", () => relay(message));
  });
}

async function relay(message: string) {
  try {
    const results = await Promise.all(
      hosts.map(async (v) => {
        for (const x of v) {
          try {
            console.log("try", x);
            return await send(x, message);
          } catch (err) {
            console.warn("failed.", x, err);
          }
        }
      })
    );
    console.log("sent.", results);
  } catch (err) {
    console.error("relay failed.", err);
  }
}

async function send(
  endpoint: { host?: string; port?: number },
  message: string
) {
  const t = createTransport({ ...endpoint, logger: true });
  const res = await t.sendMail({
    envelope: { from: "relay@danmaid.com", to: "yamada@danmaid.com" },
    raw: message,
  });
  console.log("res", res);
  return res;
}
