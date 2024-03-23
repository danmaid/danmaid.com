import { afterAll, expect, it } from '@jest/globals'
import { server } from './index'
import { connect } from 'node:http2'
import { readFileSync } from 'node:fs'

const ca = readFileSync('localhost.crt')
const client = connect('https://localhost', { ca })
client.on('error', (err) => console.error(err))

afterAll(async () => {
  await new Promise<void>(r => client.close(r))
  await new Promise(r => server.close(r))
})

it('GET exist file => 200', (done) => {
  const req = client.request({ ':path': '/xxx' })
  req.on('response', (headers, flags) => {
    console.log('response', headers, flags)
    expect(headers).toMatchObject({ ':status': 200 })
  })
  req.on('data', (chunk) => {
    console.log('data', chunk)
  })
  req.on('end', () => {
    console.log('end.')
    done()
  })
  req.end()
})

it('GET not exist file => 404', (done) => {
  const req = client.request({ ':path': '/yyy' })
  req.on('response', (headers, flags) => {
    console.log('response', headers, flags)
    expect(headers).toMatchObject({ ':status': 404 })
  })
  req.on('data', (chunk) => {
    console.log('data', chunk)
  })
  req.on('end', () => {
    console.log('end.')
    done()
  })
  req.end()
})


it('GET exist dir with application/json => 200', (done) => {
  const req = client.request({ ':path': '/', accept: 'application/json' })
  req.on('response', (headers, flags) => {
    console.log('response', headers, flags)
    expect(headers).toMatchObject({
      ':status': 200,
      'content-type': 'application/json'
    })
  })
  const chunks: Buffer[] = []
  req.on('data', (chunk) => {
    console.log('data', chunk)
    chunks.push(chunk)
  })
  req.on('end', () => {
    console.log('end.')
    const string = Buffer.concat(chunks).toString('utf-8')
    console.log(string)
    const items = JSON.parse(string)
    for (const item of items) {
      expect(item).toStrictEqual({
        name: expect.any(String),
        mtime: expect.any(String),
        size: expect.any(Number)
      })
    }
    done()
  })
  req.end()
})
