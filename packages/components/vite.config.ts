import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  base: '',
  build: {
    lib: {
      entry: resolve(__dirname, 'src/AWSV4Signature.ts'),
      fileName: 'AWSV4Signature',
      formats: ['es'],
    },
  },
})
