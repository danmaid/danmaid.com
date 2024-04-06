import { Readable } from 'node:stream'
import { HttpDecoder } from './HttpDecoder'

export class Response extends globalThis.Response {
  static async from(readable: Readable): Promise<Response> {
    const v = await new Promise<{ status: number, headers: Headers, body: Buffer }>((resolve) => {
      const http = readable.pipe(new HttpDecoder())
      http.once('response', async (status, headers) => {
        const chunks: Buffer[] = []
        readable.on('data', (chunk: Buffer) => chunks.push(chunk))
        readable.on('end', () => {
          resolve({ status, headers, body: Buffer.concat(chunks) })
        })
      })
    })
    return new this(v.body, { headers: v.headers, status: v.status })
  }
}


// class Response {
//   static async from(readable: Readable): Promise<Response> {
//     const v = await new Promise<{ status: number, headers: Headers, body: Buffer }>((resolve) => {
//       const http = readable.pipe(new HttpDecoder())
//       http.once('response', async (status, headers) => {
//         const chunks: Buffer[] = []
//         readable.on('data', (chunk: Buffer) => chunks.push(chunk))
//         readable.on('end', () => {
//           resolve({ status, headers, body: Buffer.concat(chunks) })
//         })
//       })
//     })
//     const headers = Object.fromEntries(v.headers.entries())
//     return new this(v.status, headers, v.body.length > 0 ? v.body : undefined)
//   }

//   constructor(
//     readonly status: number,
//     readonly headers: OutgoingHttpHeaders,
//     readonly body?: Buffer
//   ) { }

//   toJSON() {
//     const { status, headers } = this
//     return { status, headers }
//   }
// }
