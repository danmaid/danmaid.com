import { expect } from 'https://deno.land/std@0.210.0/expect/expect.ts';
import { cors } from './cors.ts'

Deno.test('allow が空の場合、 Vary: origin を返すこと', () => {
  const allow = { origins: [], methods: [], headers: [] }
  const req = new Request('https://danmaid.com')
  const h = cors(req, allow)
  expect(Array.from(h)).toHaveLength(1)
  expect(h.get('vary')).toBe('origin')
})

Deno.test('allow origin', () => {
  const allow = { origins: ['https://danmaid.com'], methods: [], headers: [] }
  const req = new Request('https://danmaid.com', { headers: { origin: 'https://danmaid.com' } })
  const h = cors(req, allow)
  expect(h.get('Access-Control-Allow-Origin')).toBe('https://danmaid.com')
})

Deno.test('deny origin', () => {
  const allow = { origins: [], methods: [], headers: [] }
  const req = new Request('https://danmaid.com', { headers: { origin: 'https://danmaid.com' } })
  const h = cors(req, allow)
  expect(h.get('Access-Control-Allow-Origin')).toBe(null)
})

Deno.test('allow method', () => {
  const allow = { origins: ['https://danmaid.com'], methods: ['PUT'], headers: [] }
  const headers = { 'Access-Control-Request-Method': 'PUT', origin: 'https://danmaid.com' }
  const req = new Request('https://danmaid.com', { method: 'OPTIONS', headers })
  const h = cors(req, allow)
  expect(h.get('Access-Control-Allow-Methods')).toBe('PUT')
})

Deno.test('deny method', () => {
  const allow = { origins: ['https://danmaid.com'], methods: ['PUT'], headers: [] }
  const headers = { 'Access-Control-Request-Method': 'DELETE', origin: 'https://danmaid.com' }
  const req = new Request('https://danmaid.com', { method: 'OPTIONS', headers })
  const h = cors(req, allow)
  expect(h.get('Access-Control-Allow-Methods')).toBe(null)
})

Deno.test('allow headers', () => {
  const allow = { origins: ['https://danmaid.com'], methods: [], headers: ['XXX', 'YYY'] }
  const headers = { 'Access-Control-Request-Headers': 'XXX, YYY', origin: 'https://danmaid.com' }
  const req = new Request('https://danmaid.com', { method: 'OPTIONS', headers })
  const h = cors(req, allow)
  expect(h.get('Access-Control-Allow-Headers')).toBe('XXX, YYY')
})
