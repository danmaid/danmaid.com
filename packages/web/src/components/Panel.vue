<script setup lang="ts">
defineProps<{
  parent: string
  selected?: string
}>()
defineEmits<{
  (e: 'update:selected', id?: string): void
}>()
</script>

<template>
  <div style="min-width: 300px; border: 1px solid">
    <div>{{ parent }} <button @click="load">load</button></div>
    <hr />
    <div v-for="(item, i) of items" :style="getStyle(i)" @click="select(i)">
      {{ item.title }}
    </div>
    <hr />
    <div>
      <form @submit.prevent="add">
        <input type="text" v-model="title" />
        <input type="submit" />
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { v4 as uuid } from 'uuid'

export interface Item {
  id: string
  title: string
  links?: string[]
}

export default defineComponent({
  data() {
    return {
      items: [] as Item[],
      title: '',
      selectedIndex: undefined as number | undefined,
    }
  },
  watch: {
    parent: {
      handler: 'load',
      immediate: true,
    },
    async selectedIndex(v?: number) {
      const selected = v === undefined || v < 0 ? undefined : this.items[v].id
      this.$emit('update:selected', selected)
    },
    items(v: Item[]) {
      if (!this.selected) return
      const index = v.findIndex((v) => v.id === this.selected)
      if (index < 0) return
      v.unshift(...v.splice(index, 1))
      this.selectedIndex = 0
    },
  },
  methods: {
    async load(): Promise<void> {
      const url = new URL('/index.json', location.origin)
      url.searchParams.append('links', this.parent)
      const res = await fetch(url)
      this.items = await res.json()
    },
    async add(): Promise<void> {
      const headers = new Headers({ 'Content-Type': 'application/json' })
      const item: Item = { id: uuid(), title: this.title }
      if (this.parent) item.links = [this.parent]
      const body = JSON.stringify(item)
      await fetch('/', { method: 'PUT', headers, body })
    },
    getStyle(i: number) {
      if (i !== this.selectedIndex) return undefined
      return { backgroundColor: 'cyan' }
    },
    async select(i: number) {
      if (this.selectedIndex !== undefined) {
        await this.updateStatus(this.items[this.selectedIndex].id, { active: null })
      }
      if (this.selectedIndex === i) return (this.selectedIndex = undefined)
      await this.updateStatus(this.items[i].id, { active: true })
      this.selectedIndex = i
    },
    async updateStatus(id: string, status: { active: boolean | null }) {
      const headers = new Headers({ 'Content-Type': 'application/json' })
      const body = JSON.stringify(status)
      await fetch(`/${id}`, { method: 'PATCH', headers, body })
    },
  },
})
</script>
