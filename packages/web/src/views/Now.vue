<template>
  <div style="display: flex">
    <Panel v-for="(id, i) of ids" :parent="id" :selected="ids[i + 1]" @update:selected="select(i, $event)"></Panel>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Panel from '../components/Panel.vue'

export default defineComponent({
  components: { Panel },
  data() {
    const id = this.$route.params.id
    return {
      ids: Array.isArray(id) ? id : [id],
    }
  },
  beforeRouteUpdate(to) {
    const id = to.params.id
    this.ids = Array.isArray(id) ? id : [id]
  },
  methods: {
    select(i: number, id?: string) {
      if (this.ids[i + 1] === id) return
      const ids = this.ids.slice(0, i + 1)
      if (id) ids.push(id)
      this.$router.push({ params: { id: ids } })
    },
  },
})
</script>
