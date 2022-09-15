<script setup lang="ts">
defineProps<{
  items: Record<string, unknown>[]
  headers?: { value: string; text?: string }[]
}>()
</script>

<template>
  <table>
    <thead>
      <template v-for="header of h">
        <th>{{ header.text }}</th>
      </template>
    </thead>
    <tbody>
      <template v-for="item of items">
        <tr>
          <template v-for="header of h">
            <td style="border-right: 1px solid; border-bottom: 1px solid">{{ item[header.value] }}</td>
          </template>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      h: this.headers,
    }
  },
  mounted() {
    if (!this.headers) {
      const headers = new Set<string>()
      this.items.forEach((v) => Object.keys(v).forEach((v) => headers.add(v)))
      this.h = Array.from(headers).map((v) => ({ value: v, text: v }))
    }
  },
})
</script>
