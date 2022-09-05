<template>
  <div>
    <button @click="load">load</button>
    <hr />
    <table>
      <thead>
        <th v-for="header of headers">{{ header }}</th>
      </thead>
      <tbody>
        <tr v-for="history of histories">
          <td v-for="header of headers">{{ history[header] }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <router-view></router-view>
  <hr />
  <GET></GET>
  <hr />
  <PUT></PUT>
  <hr />
  <div>{{ $route }}</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import PUT from './components/PUT.vue'
import GET from './components/GET.vue'

export default defineComponent({
  data() {
    return {
      histories: [],
    }
  },
  computed: {
    headers(): string[] {
      const keys = this.histories.flatMap((v) => Object.keys(v))
      const unique = keys.reduce((acc, v) => acc.add(v), new Set<string>())
      return Array.from(unique)
    },
  },
  methods: {
    async load() {
      const res = await fetch('/index.json')
      this.histories = await res.json()
    },
  },
  components: { PUT, GET },
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
