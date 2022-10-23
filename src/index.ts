import { core, isObject } from './core'
import {
  appendIndex,
  ContentEvent,
  isContentEvent,
  isPathEvent,
  linkContent,
  PathEvent,
  saveContent,
  updateIndex,
} from './file'
import { join } from 'node:path'

export { server } from './http'

/**
 * 全てのイベントを保存する。
 * イベント履歴などで使う。
 * ここで saveContent するため、 content のストリームは他で使えないことに注意
 */
core.on(isContentEvent, (ev) => saveContent(ev, { path: join('data/events', ev.id) }))
core.on(isObject, (ev) => appendIndex(ev, { file: 'data/events/index.jsonl' }).then(() => {}))

// { content, path }
core.on<ContentEvent & PathEvent>(
  (ev) => isContentEvent(ev) && isPathEvent(ev),
  (ev) => linkContent(ev, { path: join('data/paths', ev.path) })
)
core.on<ContentEvent & PathEvent>(
  (ev) => isContentEvent(ev) && isPathEvent(ev),
  (ev) => updateIndex({ ...ev, id: ev.path }, { dir: 'data/paths' })
)
