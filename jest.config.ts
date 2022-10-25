import type { Config } from 'jest'

export default async (): Promise<Config> => {
  return {
    preset: 'ts-jest',
    collectCoverage: true,
    collectCoverageFrom: ['<rootDir>/src/**/*'],
    globalSetup: './tests/setup.ts',
    globalTeardown: './tests/teardown.ts',
    globals: {
      __URL__: 'http://localhost:8520',
    },
  }
}
