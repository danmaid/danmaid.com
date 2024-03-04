import { RequestEvent, ResponseEvent } from "./events.ts";
import "./logger.ts";
import "./handler.ts";

Deno.serve(
  {
    port: 443,
    cert: Deno.readTextFileSync(
      Deno.env.get("CERT_FILE") || "../localhost.crt"
    ),
    key: Deno.readTextFileSync(Deno.env.get("KEY_FILE") || "../localhost.key"),
  },
  async (request, info) => {
    const req = new RequestEvent(request, info);
    dispatchEvent(req);
    const response = await req.response;
    const res = new ResponseEvent(response, req.id);
    dispatchEvent(res);
    return res.response;
  }
);

addEventListener("error", (ev) => {
  console.error(ev.error);
  ev.preventDefault();
});
addEventListener("unhandledrejection", (ev) => {
  console.error(ev.reason);
  ev.preventDefault();
});

// declare global {
//   interface WindowEventMap {
//     request: RequestEvent;
//     response: ResponseEvent;
//   }
// }
