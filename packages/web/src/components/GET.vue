<template>
  <div>GET</div>
  {{ data }}
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      data: undefined,
      events: undefined as EventSource | undefined,
    }
  },
  mounted() {
    this.load()
  },
  beforeUnmount() {
    this.unload()
  },
  beforeRouteUpdate() {
    this.unload()
    this.load()
  },
  methods: {
    async get(): Promise<void> {
      const res = await fetch(this.$route.path)
      if (!res.ok) return
      this.data = await res.json()
    },
    update(ev: MessageEvent) {
      const data = JSON.parse(ev.data)
      if (data.path === this.$route.path) this.get()
    },
    load() {
      this.data = undefined
      this.get()
      this.events = new EventSource(this.$route.path)
      this.events.addEventListener('stored', this.update)
    },
    unload() {
      this.events?.removeEventListener('stored', this.update)
      this.events?.close()
      this.events = undefined
    },
  },
})
</script>
