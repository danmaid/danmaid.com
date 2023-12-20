import { test, expect, afterAll } from "@jest/globals";
import { SMTPServer } from "smtp-server";
import net from "node:net";
import { createTransport } from "nodemailer";

function getPort(server: Pick<net.Server, "address">): number {
  const addr = server.address();
  if (addr && typeof addr === "object") return addr.port;
  throw Error("port is not found.");
}

test("", async () => {
  const smtp = new SMTPServer({
    disabledCommands: ["STARTTLS", "AUTH"],
    logger: true,
    onConnect(session, callback) {
      console.log("onConnect", session);
      callback();
    },
    onClose(session) {
      console.log("onClose", session);
    },
    onAuth(auth, session, callback) {
      console.log("onAuth", auth, session);
      callback(undefined);
    },
    async onData(stream, session, callback) {
      console.log("onData", stream, session);

      stream.pipe(process.stdout);
      callback();
    },
    onMailFrom(address, session, callback) {
      console.log("onMailFrom", address, session);
      callback();
    },
    onRcptTo(address, session, callback) {
      console.log("onRcptTo", address, session);
      callback();
    },
  });
  const server = smtp.listen();
  const port = getPort(server);
  console.log(server.address());
  const client = createTransport({ port });
  const sent = await client.sendMail({
    from: "xxx@danmaid.com",
    to: "yyy@danmaid.com",
    subject: "sss",
    text: "ＸＹＺ",
  });
  console.log("sent", sent);
  server.close();
  await new Promise<void>((r) => setTimeout(r, 1000));
});
