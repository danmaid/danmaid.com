export default async function () {
  const server = globalThis.__CORE__
  await new Promise((r) => server?.close(r))
}
