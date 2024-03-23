import { Http2ServerRequest, Http2ServerResponse, connect, IncomingHttpHeaders, IncomingHttpStatusHeader } from 'node:http2'
import { stat, readdir, rm, rmdir, writeFile, mkdir } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { config } from './config'

export async function handler(req: Http2ServerRequest, res: Http2ServerResponse) {
  const path = new URL(req.url, 'https://localhost').pathname
  if (req.method === 'GET') {
    try {
      const info = await stat(join(config.dir, path))
      if (info.isDirectory()) {
        if (!path.endsWith('/')) return res.writeHead(307, { location: path + '/' })
        if (req.headers.accept?.match('application/json')) {
          const files = await readdir(join(config.dir, path))
          const items = await Promise.all(files.map(async (name) => {
            const s = await stat(join(config.dir, path, name))
            const { mtime, size } = s
            return { name, mtime, size, isDirectory: s.isDirectory() }
          }))
          const body = JSON.stringify(items)
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Length': body.length,
            'Last-Modified': new Date(info.mtime).toUTCString(),
            "cache-control": 'no-store'
          })
          return res.end(body)
        }
        try {
          const url = new URL(config.index)
          const client = connect(url, { ca: config.cert })
          const req = client.request({ ':path': url.pathname })
          type H = IncomingHttpHeaders & IncomingHttpStatusHeader
          const h = await new Promise<H>((r) => req.on('response', r))
          const headers = Object.fromEntries(Object.entries(h).filter(([k]) => !k.startsWith(':')))
          res.writeHead(h[':status'] || 500, { ...headers, 'content-location': url.href })
          req.pipe(res)
          req.on('close', () => client.close())
        } catch (error) {
          console.warn(error)
          res.end(config.index)
        }
        return
      }
      res.writeHead(200, {
        'Content-Length': info.size,
        'Last-Modified': new Date(info.mtime).toUTCString(),
        'vary': 'Accept',
      })
      return createReadStream(join(config.dir, path)).pipe(res)
    } catch (err: any) {
      if (err.code === 'ENOENT') return res.writeHead(404).end()
      console.warn(err)
      return res.writeHead(500).end()
    }
  }
  if (req.method === 'DELETE') {
    try {
      await rm(path)
      return res.end()
    } catch (err: any) {
      if (err.code === 'ENOENT') return res.writeHead(404).end()
      if (err.code === 'ERR_FS_EISDIR') {
        await rmdir(path)
        return res.end()
      }
      console.error(err)
      return res.writeHead(500).end()
    }
  }
  if (req.method === 'PUT') {
    await writeFile(path, req)
    return res.end()
  }
  if (req.method === 'MKCOL') {
    try {
      await mkdir(path)
      return res.writeHead(201).end()
    } catch (err: any) {
      if (err.code === 'EEXIST') return res.writeHead(405).end()
      console.error(err)
      return res.writeHead(500).end()
    }
  }
  res.writeHead(501).end()
}
