it('DELETE', async () => {
  {
    const res = await fetch('https://danmaid.com/xxx')
    await res.body?.cancel()
    expect(res.ok).toBe(true)
  }
  {
    const res = await fetch('https://danmaid.com/xxx', { method: 'DELETE' })
    await res.body?.cancel()
    expect(res.ok).toBe(true)
  }
  {
    const res = await fetch('https://danmaid.com/xxx')
    await res.body?.cancel()
    expect(res.ok).toBe(false)
  }
})

it('DELETE with relates', async () => {
  {
    const res = await fetch('https://danmaid.com/xxx')
    await res.body?.cancel()
    expect(res.ok).toBe(true)
    expect(res.headers.get('content-type')).toBe('text/html')
    expect(res.headers.get('content-location')).toBe('xxx.text.html')
    {
      const res = await fetch('https://danmaid.com/xxx.application.json')
      await res.body?.cancel()
      expect(res.ok).toBe(true)
    }
    {
      const res = await fetch('https://danmaid.com/xxx.text.html')
      await res.body?.cancel()
      expect(res.ok).toBe(true)
    }
    {
      const res = await fetch('https://danmaid.com/xxx.text.html.application.json')
      await res.body?.cancel()
      expect(res.ok).toBe(true)
    }
  }
  {
    const res = await fetch('https://danmaid.com/xxx', { method: 'DELETE' })
    await res.body?.cancel()
    expect(res.ok).toBe(true)
    expect(res.headers.get('content-location')).toBe('xxx.text.html')
  }
  {
    const res = await fetch('https://danmaid.com/xxx')
    await res.body?.cancel()
    expect(res.ok).toBe(false)
    {
      const res = await fetch('https://danmaid.com/xxx.application.json')
      await res.body?.cancel()
      expect(res.ok).toBe(false)
    }
    {
      const res = await fetch('https://danmaid.com/xxx.text.html')
      await res.body?.cancel()
      expect(res.ok).toBe(false)
    }
    {
      const res = await fetch('https://danmaid.com/xxx.text.html.application.json')
      await res.body?.cancel()
      expect(res.ok).toBe(false)
    }
  }
})
