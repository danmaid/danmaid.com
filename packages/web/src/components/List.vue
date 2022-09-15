<script setup lang="ts">
defineProps<{ items: unknown[] }>()
</script>

<template>
  <div>
    <div v-for="item of items">
      <slot :item="item">{{ item }}</slot>
    </div>
  </div>
</template>
