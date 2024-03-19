import { createSecureServer, Http2SecureServer, IncomingHttpHeaders, ServerHttp2Stream } from 'node:http2'
import { join } from 'node:path'
import { readdir, stat, rm, rmdir, mkdir, writeFile } from 'node:fs/promises'
import { SecureContextOptions } from 'node:tls'
import EventEmitter from 'node:events'

EventEmitter.captureRejections = true

export interface ContentsServer {
  on(event: 'error', listener: (...args: any[]) => void): this
  on(event: "stream", listener: (stream: ServerHttp2Stream, headers: IncomingHttpHeaders, flags: number) => void): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this
}

class Session {
  path: string
  constructor(readonly stream: ServerHttp2Stream, readonly headers: IncomingHttpHeaders, readonly flags: number) {
    if (!headers[':path']) {
      this.send(400)
      throw Error('BadRequest')
    }
    this.path = headers[':path']
  }

  send(status: number, headers?: Record<string, string>, body?: any) {
    this.stream.respond({ ':status': status, ...headers })
    this.stream.end(body)
  }
}

export class ContentsServer extends EventEmitter {
  #server: Http2SecureServer
  dir = './data'
  index = './index.html'

  constructor(options: SecureContextOptions = {}) {
    super()
    const server = createSecureServer(options)
    server.on('error', (...args) => this.emit('error', ...args))
    server.on('stream', (...args) => this.emit('stream', ...args))
    server.on('stream', (...args) => this.onstream(...args))
    this.#server = server
  }

  async listen(port = 443) {
    await new Promise<void>((r) => this.#server.listen(port, r))
  }

  setSecureContext(options: Pick<SecureContextOptions, 'key' | 'cert'>) {
    return this.#server.setSecureContext(options)
  }

  async onstream(stream: ServerHttp2Stream, headers: IncomingHttpHeaders, flags: number) {
    const session = new Session(stream, headers, flags)
    const path = join(this.dir, session.path)
    if (headers[':method'] === 'GET') {
      stream.respondWithFile(path, {}, {
        onError: async (err) => {
          if (err.code === 'ENOENT') return session.send(404)
          try {
            const files = await readdir(path)
            if (!session.path.endsWith('/'))
              return session.send(307, { location: headers[':path'] + '/' })
            if (headers.accept?.match('application/json')) {
              const items = await Promise.all(files.map(async (name) => {
                const s = await stat(join(path, name))
                return {
                  name,
                  mtime: s.mtime,
                  size: s.size,
                  isDirectory: s.isDirectory()
                }
              }))
              return session.send(200, { 'content-type': 'application/json' }, JSON.stringify(items))
            }
            stream.respondWithFile(this.index)
          } catch (err) {
            console.error(err)
            session.send(500)
          }
        },
      })
      return
    }
    if (headers[':method'] === 'DELETE') {
      try {
        await rm(path)
        session.send(200)
      } catch (err: any) {
        if (err.code === 'ENOENT') return session.send(404)
        if (err.code === 'ERR_FS_EISDIR') {
          await rmdir(path)
          return session.send(200)
        }
        console.error(err)
        session.send(500)
        return
      }
      return
    }
    if (headers[':method'] === 'PUT') {
      await writeFile(path, stream)
      return session.send(200)
    }
    if (headers[':method'] === 'MKCOL') {
      try {
        await mkdir(path)
        return session.send(201)
      } catch (err: any) {
        if (err.code === 'EEXIST') return session.send(405)
        console.error(err)
        session.send(500)
      }
    }
    session.send(501)
  }
}
