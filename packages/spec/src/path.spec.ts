beforeEach(async () => {
  await fetch('/xxx/yyy/', { method: 'DELETE', headers: { 'content-type': '*/*' } })
  await fetch('/xxx/yyy', { method: 'DELETE', headers: { 'content-type': '*/*' } })
  await fetch('/xxx/', { method: 'DELETE', headers: { 'content-type': '*/*' } })
  await fetch('/xxx', { method: 'DELETE', headers: { 'content-type': '*/*' } })
})

describe('/xxx', () => {
  it('a', async () => {
    const body = 'xxx';
    const res = await fetch('/xxx', { method: "PUT", body });
    expect(res.status).toBe(200);
    await res.body?.cancel();
  })
  it('b', async () => { })
})

describe('/xxx/', () => { })
describe('/xxx/yyy', () => { })
describe('/xxx/yyy/', () => { })
