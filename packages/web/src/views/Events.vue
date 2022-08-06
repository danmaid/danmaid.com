<template>
  <button @click="load">load</button>
  <table>
    <thead>
      <th>id</th>
      <th>method</th>
      <th>url</th>
      <th>headers</th>
    </thead>
    <tbody>
      <tr v-for="event of items">
        <td>{{ event.id }}</td>
        <td>{{ event.method }}</td>
        <td>{{ event.url }}</td>
        <td>{{ event.headers }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  data(): {
    items: { id: string; url: string; method: string; headers: Record<string, string> }[]
    events?: EventSource
  } {
    return {
      items: [],
      events: undefined,
    }
  },
  methods: {
    async load() {
      if (this.events) this.events.close()
      const res = await fetch('/events/.json')
      this.items = await res.json()
      const events = new EventSource('/events')
      events.addEventListener('request', (ev) => {
        const item = JSON.parse(ev.data)
        this.items.push(item)
      })
      this.events = events
    },
  },
})
</script>
