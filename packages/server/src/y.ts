import { Server } from "node:http";

class ExServer extends Server {
  emit(event: string, ...args: any[]): boolean {
    if (event !== "request") return super.emit(event, ...args);
    if (args[0]?.headers?.accept?.includes("text/event-stream")) {
      return super.emit("sse", ...args);
    }
    return super.emit(event, ...args);
  }
}

const sv = new ExServer((req, res) => {
  console.log("constructor");
  res.end();
});
sv.on("request", (req, res) => {
  console.log("request");
  res.end();
});
sv.on("sse", (req, res) => {
  console.log("sse");
  res.end();
});

sv.listen(6969, () => console.log("listen: http://localhost:6969"));
