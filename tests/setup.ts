import { Core } from '../src'

declare global {
  var __CORE__: Core
}

export default async function () {
  const server = new Core()
  await new Promise<void>((r) => server.listen(8520, r))
  globalThis.__CORE__ = server
}
