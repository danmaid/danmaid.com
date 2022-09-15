<script setup lang="ts">
defineProps<{
  id: string
  name?: string
  type?: string
}>()
</script>

<template>
  <div>{{ value }}</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      value: undefined,
    }
  },
  async mounted() {
    const headers = new Headers()
    if (this.type) headers.set('accept', this.type)
    const res = await fetch(this.id, { headers })
    if (!res.ok) return
    this.value = await res.json()
  },
})
</script>
