<template>
  <div>Console</div>
  <div v-for="line of lines">
    <GetObject v-model="line.value" v-bind="line"></GetObject>
  </div>
  <form @submit.prevent="post">
    <textarea v-model="value"></textarea>
    <input type="submit" />
  </form>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import GetObject from './GetObject.vue'

interface Index {
  id: string
  type?: string
  value: any
  loading?: boolean
}

export default defineComponent({
  props: {
    endpoint: { type: String, default: '' },
  },
  data(): {
    lines: Index[]
    listener?: EventSource
    value: any
  } {
    return {
      lines: [],
      listener: undefined,
      value: undefined,
    }
  },
  mounted() {
    this.load()
    this.listen()
  },
  methods: {
    async load(): Promise<void> {
      const res = await fetch(this.endpoint)
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data)) return
      this.lines = data
    },
    async post(): Promise<void> {
      const res = await fetch(this.endpoint, { method: 'POST', body: this.value })
      if (!res.ok) return
    },
    listen(): void {
      const listener = new EventSource(this.endpoint)
      listener.addEventListener('added', (v) => this.lines.push(JSON.parse(v.data)))
      this.listener = listener
    },
  },
  components: { GetObject },
})
</script>
