import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/todos', component: () => import('./components/TodoList.vue') },
    // { path: '/events', component: () => import('./views/Events.vue') },
    // { path: '/:id+', component: () => import('./views/Now.vue') },
    { path: '/console', component: () => import('./components/Console.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('./components/Console.vue') },
  ],
})

createApp(App).use(router).mount('#app')
