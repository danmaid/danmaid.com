import { SMTPServer } from "smtp-server";
import { randomUUID } from "node:crypto";
import { connect } from "node:http2";

interface Meta {
  "Content-Type": "message/rfc822";
  "Mail-From"?: string;
  "Rcpt-To"?: string[];
}

export const server = new SMTPServer({
  disabledCommands: ["STARTTLS", "AUTH"],
  logger: true,

  async onData(stream, session, callback) {
    try {
      const meta: Meta = { ...session, "Content-Type": "message/rfc822" };
      if (session.envelope.mailFrom)
        meta["Mail-From"] = session.envelope.mailFrom.address;
      if (session.envelope.rcptTo)
        meta["Rcpt-To"] = session.envelope.rcptTo.map((v) => v.address);
      const id = randomUUID();
      const req = connect("https://danmaid.com").request({
        ...meta,
        ":method": "PUT",
        ":path": `/${id}`,
      });
      stream.pipe(req);
      req.on("response", (headers) => console.log("stored.", id, headers));
      callback();
    } catch (err) {
      console.error(err);
      stream.destroy();
      return callback(Error());
    }
  },
});
