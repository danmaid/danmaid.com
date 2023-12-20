import { SMTPServer } from "smtp-server";
import * as store from "@danmaid/store";

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
      const id = await store.add(stream, meta);
      callback();
      console.log("stored.", id);
    } catch (err) {
      console.error(err);
      stream.destroy();
      return callback(Error());
    }
  },
});
