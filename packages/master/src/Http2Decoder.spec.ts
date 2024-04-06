import { it, expect } from '@jest/globals'
import { Readable } from 'node:stream'
import { Http2Decoder } from './Http2Decoder'

it("in.pipe(decoder), decoder.once('response'), decoder.pipe(out)", async () => {
  const stream = Readable.from(['HTTP/1.1 200 OK\r\n', '\r\n', 'xxx'])
  const response = stream.pipe(new Http2Decoder()).response()
  await expect(response).resolves.toStrictEqual({
    headers: { ':status': 200 },
    body: expect.any(Readable)
  })

  const { body } = await response
  const chunks: Buffer[] = []
  body.on('data', (chunk) => chunks.push(chunk))
  await new Promise(resolve => body.once('end', resolve))
  expect(Buffer.concat(chunks)).toStrictEqual(Buffer.from('xxx'))
})
