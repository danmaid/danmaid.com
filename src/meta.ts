import { appendItem, updateItem } from './jsonl'

export async function appendIndex() {
  await appendItem()
}
export async function updateIndex(ev) {
  const id = ev.id
  await updateItem(target, (item) => item.id === id, ev)
}
