export const test = {
  describe: (...args: any[]) => console.log('describe', args),
}

export function expect(...args: any[]) {
  console.log('expect', args)
  return { not: { toBe: (...args: any[]) => console.log('toBe', args) } }
}
