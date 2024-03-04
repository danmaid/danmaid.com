// use with --import-map
import * as actual from './file.actual.ts'

interface Mocked<T extends (...args: any[]) => any> extends Mock<T> {
  (...args: Parameters<T>): ReturnType<T>
}

function mock<T extends (...args: any[]) => any>(actual: T): Mocked<T> {
  const mock = new Mock(actual)
  return Object.assign(mock.fn, mock)
}

class Mock<T extends (...args: any[]) => any> {
  readonly calls: Parameters<T>[] = []
  #actual: T
  #impl: T
  constructor(actual: T) {
    this.#impl = this.#actual = actual
  }
  fn = (...args: Parameters<T>): ReturnType<T> => {
    this.calls.push(args)
    return this.#impl(...args)
  }
  setImpl = (impl: T) => {
    this.#impl = impl
  }
  reset = () => {
    this.#impl = this.#actual
  }
}

export const save = mock(actual.save)
export const load = mock(actual.load)
export const remove = mock(actual.remove)
