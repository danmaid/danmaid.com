declare function describe(title: string, fn: () => void): void
declare function beforeAll(fn: () => void | Promise<void>): void
declare function beforeEach(fn: () => void | Promise<void>): void

declare function it(title: string, fn: () => void | Promise<void>): void

declare function expect(value: unknown): { toBe(expected: unknown): void }
