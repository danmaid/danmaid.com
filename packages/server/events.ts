export class BaseEvent extends Event {
  timeStamp = new Date().getTime();
}

export class RequestEvent extends BaseEvent {
  response?: Response;
  constructor(
    public readonly id = crypto.randomUUID(),
    public readonly request: Request,
    public readonly info: Deno.ServeHandlerInfo
  ) {
    super("request");
  }
}

export class ResponseEvent extends BaseEvent {
  constructor(
    public readonly response: Response,
    public readonly request: string
  ) {
    super("response");
  }
}

export class StoreEvent extends BaseEvent {
  constructor(
    public readonly path: string,
    public readonly meta: Record<string, string>
  ) {
    super("stored");
  }
}
