<template>
  <div>Todo</div>
  <hr />
  <form @submit.prevent="post" @reset="reset">
    <input type="text" v-model="body" />
    <input type="submit" />
  </form>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'

interface Item {}

export default defineComponent({
  props: {
    modelValue: { type: Array as PropType<Item[]> },
    endpoint: { type: String, default: '/todos' },
  },
  emits: ['update:modelValue'],
  data(): { items?: Item[]; body: string } {
    return {
      items: this.modelValue,
      body: '',
    }
  },
  mounted() {
    if (this.items === undefined) this.load()
  },
  methods: {
    async load(): Promise<void> {
      const res = await fetch(this.endpoint)
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data)) return
      this.items = data
    },
    async post(): Promise<void> {
      const res = await fetch(this.endpoint, { method: 'POST', body: this.body })
      if (!res.ok) return
      this.reset()
    },
    reset(): void {
      this.body = ''
    },
  },
})
</script>
