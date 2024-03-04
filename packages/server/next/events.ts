export class RequestEvent extends Event {
  response: Response | Promise<Response> = new Response(null, { status: 500 });
  readonly id = crypto.randomUUID();
  constructor(
    public readonly request: Request,
    public readonly info: Deno.ServeHandlerInfo
  ) {
    super("request");
  }
}

export class ResponseEvent extends Event {
  constructor(
    public readonly response: Response,
    public readonly request: string
  ) {
    super("response");
  }
}
