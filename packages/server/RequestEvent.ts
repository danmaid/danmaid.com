export class RequestEvent extends Event {
  readonly body: ReadableStream<Uint8Array> | null;
  readonly headers: Headers;
  readonly method: string;
  readonly url: string;
  response?: Response | Promise<Response>;

  constructor(input: RequestInfo, options?: RequestInit) {
    super("request");
    this.url = input.url;
    this.body = input.body;
    this.headers = input.headers;
    this.method = input.method;
  }

  respondWith(response: Response | Promise<Response>): void {}
}
