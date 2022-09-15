<template>
  <div>PUT</div>
  <form @submit.prevent="put">
    <textarea v-model="text" placeholder="テキスト"></textarea>
    <input type="submit" />
  </form>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      text: '',
    }
  },
  methods: {
    async put(): Promise<void> {
      const headers = new Headers({ 'Content-Type': 'application/json' })
      const item = { text: this.text }
      const body = JSON.stringify(item)
      const res = await fetch('/', { method: 'POST', headers, body })
      // if (res.ok) location.reload()
    },
  },
})
</script>
