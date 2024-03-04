it('一覧の更新、取得', async () => {
  const url = '/expenses/'
  const body = 'xxx\nyyy\nzzz\n'
  const type = 'text/plain'
  {
    const headers = { 'content-type': type }
    const res = await fetch(url, { method: 'PUT', body, headers })
    expect(res.ok).toBe(true)
    res.body?.cancel()
  }
  {
    const res = await fetch(url, { headers: { accept: type } })
    expect(res.ok).toBe(true)
    const data = await res.text()
    expect(data).toBe(body)
  }
})
