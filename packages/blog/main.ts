import { JSDOM } from 'jsdom'
import { readFile, writeFile, readdir, copyFile, mkdir, rm } from 'fs/promises'
import { marked } from 'marked'
import { format } from 'prettier'
import { join, basename, dirname } from 'node:path'

const src = './posts'
const dist = './dist'

await rm(dist, { recursive: true }).catch(() => {})
await mkdir(dist)
await copyRecursive(src, dist)

async function copyRecursive(src: string, dist: string): Promise<void> {
  for (const file of await readdir(src, { withFileTypes: true })) {
    if (file.isFile()) {
      await copyFile(join(src, file.name), join(dist, file.name))
      if (file.name.endsWith('.md')) await mdToHtml(join(src, file.name), join(dist, file.name))
    }
    if (file.isDirectory()) {
      await mkdir(join(dist, file.name))
      await copyRecursive(join(src, file.name), join(dist, file.name))
    }
  }
}

async function mdToHtml(src: string, dist: string): Promise<void> {
  const dom = await JSDOM.fromFile('template.html')
  const main = dom.window.document.querySelector('#main')

  const content = await readFile(src, { encoding: 'utf-8' })

  if (!main) throw Error('invalid template. #main not found.')
  main.innerHTML = await marked(content, { async: true })

  const html = format(dom.serialize(), { parser: 'html' })
  await writeFile(join(dirname(dist), basename(dist, '.md') + '.html'), html, { encoding: 'utf-8' })
}
