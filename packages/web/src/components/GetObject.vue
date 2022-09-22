<script setup lang="ts">
defineProps<{
  modelValue?: unknown
  id: string
  name?: string
  type?: string
}>()
defineEmits<{
  (e: 'update:modelValue', value: unknown): void
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
      value: this.modelValue,
    }
  },
  watch: {
    value(v: unknown) {
      this.$emit('update:modelValue', v)
    },
  },
  async mounted() {
    if (this.value !== undefined) return
    const headers = new Headers()
    if (this.type) headers.set('accept', this.type)
    const res = await fetch(this.id, { headers })
    if (!res.ok) return
    const type = res.headers.get('Content-Type')
    if (!type) return
    this.value = /json/.test(type) ? await res.json() : /text/.test(type) ? await res.text() : await res.blob()
  },
})
</script>
