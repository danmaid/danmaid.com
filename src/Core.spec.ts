import { Core } from './Core'

describe('', () => {
  const core = new Core()

  it('matcher が true を返すとき、リスナーが呼ばれること', async () => {
    const fn = jest.fn()
    core.on(() => true, fn)
    core.emit()
    expect(fn).toBeCalled()
  })

  it('matcher が false を返すとき、リスナーが呼ばれないこと', async () => {
    const fn = jest.fn()
    core.on(() => false, fn)
    core.emit()
    expect(fn).not.toBeCalled()
  })
})
