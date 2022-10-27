import server from '../src/index2'

declare global {
  var __CORE__: any
}

export default async function () {
  await new Promise<void>((r) => server.listen(8520, r))
  globalThis.__CORE__ = server
}
