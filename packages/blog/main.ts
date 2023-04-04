import { JSDOM } from 'jsdom'
import { readFile, writeFile } from 'fs/promises'
import { marked } from 'marked'
import { format } from 'prettier'

const dom = await JSDOM.fromFile('template.html')
const main = dom.window.document.querySelector('#main')

const content = await readFile('src/test.md', { encoding: 'utf-8' })

if (!main) throw Error('main not found.')
main.innerHTML = await marked(content, { async: true })

const html = format(dom.serialize(), { parser: 'html' })
console.log(html)
await writeFile('dist/test.html', html, { encoding: 'utf-8' })
