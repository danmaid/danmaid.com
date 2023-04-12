import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  base: '/events',
  // build: {
  //   lib: {
  //     entry: resolve(__dirname, 'src/dm-test.ts'),
  //     fileName: 'dm-test',
  //     formats: ['es'],
  //   },
  // },
})
