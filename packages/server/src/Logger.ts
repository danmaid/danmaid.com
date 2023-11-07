import { Console } from "node:console";
import WebSocket, { createWebSocketStream } from "ws";
import { PassThrough } from "node:stream";
import { format } from "node:util";

export class Logger extends Console {
  logBuffer = new PassThrough();
  debugBuffer = new PassThrough();
  infoBuffer = new PassThrough();
  warnBuffer = new PassThrough();
  errorBuffer = new PassThrough();

  constructor(url: string) {
    super(process.stdout);
    this.logBuffer.pipe(process.stdout);
    this.logBuffer.pipe(createWebSocketStream(new WebSocket(`${url}/log`)));
    this.debugBuffer.pipe(process.stdout);
    this.debugBuffer.pipe(createWebSocketStream(new WebSocket(`${url}/debug`)));
    this.infoBuffer.pipe(process.stdout);
    this.infoBuffer.pipe(createWebSocketStream(new WebSocket(`${url}/info`)));
    this.warnBuffer.pipe(process.stderr);
    this.warnBuffer.pipe(createWebSocketStream(new WebSocket(`${url}/warn`)));
    this.errorBuffer.pipe(process.stderr);
    this.errorBuffer.pipe(createWebSocketStream(new WebSocket(`${url}/error`)));
  }

  log(...args: Parameters<Console["log"]>): void {
    this.logBuffer.push(format(...args) + "\n");
  }
  debug(...args: Parameters<Console["debug"]>): void {
    this.debugBuffer.push(format(...args) + "\n");
  }
  info(...args: Parameters<Console["info"]>): void {
    this.infoBuffer.push(format(...args) + "\n");
  }
  warn(...args: Parameters<Console["warn"]>): void {
    this.warnBuffer.push(format(...args) + "\n");
  }
  error(...args: Parameters<Console["error"]>): void {
    this.errorBuffer.push(format(...args) + "\n");
  }

  close() {
    this.logBuffer.end();
    this.debugBuffer.end();
    this.infoBuffer.end();
    this.warnBuffer.end();
    this.errorBuffer.end();
  }
}
