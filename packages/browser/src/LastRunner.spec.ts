import { expect, jest, test } from '@jest/globals'
import { createLastRunner } from './LastRunner'

test('createLastRunner', async () => {
  const runner = createLastRunner()
  expect(runner).toBeInstanceOf(Function)
  const results: number[] = []
  async function wait(v: number): Promise<typeof v> {
    await new Promise<void>(r => setTimeout(r, 10))
    results.push(v)
    return v
  }
  const x = [() => wait(0), () => wait(1), () => wait(2)]
  const x0 = jest.spyOn(x, 0)
  const x1 = jest.spyOn(x, 1)
  const x2 = jest.spyOn(x, 2)

  await expect(runner(x[0])).resolves.toBe(0)
  expect(runner(x[1])).rejects.toThrowError('cancel')
  await expect(runner(x[2])).resolves.toBe(2)
  expect(x0).toBeCalledTimes(1)
  expect(x1).not.toBeCalled()
  expect(x2).toBeCalledTimes(1)
  expect(results).toStrictEqual([0, 2])
})
