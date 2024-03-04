const defaultResponse = new Response(null, { status: 501 })
const kResponse = Symbol('response')

export class RequestEvent extends Event implements globalThis.RequestEvent {
  constructor(readonly request: Request, readonly info: Deno.ServeHandlerInfo) {
    super('request')
  }

  [kResponse]: Response | Promise<Response> = defaultResponse
  respondWith(response: Response | Promise<Response>): void {
    if (this[kResponse] !== defaultResponse)
      throw new DOMException('already called.', 'InvalidStateError')
    this[kResponse] = response
  }
}

export class ResponseEvent extends Event implements globalThis.ResponseEvent {
  constructor(readonly response: Response, readonly request: Request) {
    super('response')
  }
}

export function serve(options: Deno.ServeOptions | Deno.ServeTlsOptions = { port: 6969 }) {
  return Deno.serve(options, async (req, info) => {
    try {
      const ev = new RequestEvent(req, info)
      dispatchEvent(ev)
      const res = await ev[kResponse]
      dispatchEvent(new ResponseEvent(res, req))
      return res
    } catch (err) {
      console.error(err)
      const res = new Response(null, { status: 500 })
      dispatchEvent(new ResponseEvent(res, req))
      return res
    }
  })
}


declare global {
  interface WindowEventMap {
    request: RequestEvent
    response: ResponseEvent
  }
  interface RequestEvent extends Event {
    readonly request: Request
    respondWith(response: Response | Promise<Response>): void
  }
  interface ResponseEvent extends Event {
    readonly response: Response
    readonly request: Request
  }
}
