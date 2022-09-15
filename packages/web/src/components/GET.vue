<template>
  <div>GET</div>
  <template v-if="Array.isArray(data)">
    <div v-for="item of data">
      <GETDetail v-bind="item"></GETDetail>
      {{ item }}
    </div>
  </template>
  {{ data }}
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import GETDetail from './GETDetail.vue'

export default defineComponent({
  data() {
    return {
      data: undefined,
      events: undefined as EventSource | undefined,
    }
  },
  watch: {
    $route() {
      this.unload()
      this.load()
    },
  },
  mounted() {
    this.load()
  },
  beforeUnmount() {
    this.unload()
  },
  methods: {
    async get(): Promise<void> {
      console.log('get', this.$route.path)
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
  components: { GETDetail },
})
</script>
