<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useJournal } from '../stores/journal'
import { STATUS_META, STATUS_ORDER } from '../types'

const journal = useJournal()
const route = useRoute()

// NavLink to="/library" end — активна только при точном совпадении пути.
const libraryActive = computed(() => route.path === '/library')
// NavLink to="/feed" без end — активна и на вложенных путях.
const feedActive = computed(() => route.path === '/feed' || route.path.startsWith('/feed/'))
</script>

<template>
  <aside class="side">
    <RouterLink to="/" class="brand">
      <span class="logo" />
      <span>
        <b>Book Journal</b>
        <small>дневник чтения</small>
      </span>
    </RouterLink>

    <nav class="bj-nav">
      <RouterLink to="/library" :class="libraryActive ? 'on' : undefined">
        <span
          :style="{
            width: '16px',
            height: '16px',
            border: '1.6px solid currentColor',
            borderRadius: '2px 3px 3px 2px',
          }"
        />
        Библиотека
      </RouterLink>
      <RouterLink to="/feed" :class="feedActive ? 'on' : undefined">
        <span
          :style="{
            width: '16px',
            height: '16px',
            border: '1.6px solid currentColor',
            borderRadius: '50%',
          }"
        />
        Лента дневника
      </RouterLink>
    </nav>

    <div class="label">СТАТУСЫ</div>
    <RouterLink v-for="status in STATUS_ORDER" :key="status" to="/library" class="stat">
      <span class="l">
        <span class="dot" :style="{ background: STATUS_META[status].color }" />
        {{ STATUS_META[status].label }}
      </span>
      <span class="n">{{ journal.booksByStatus(status).length }}</span>
    </RouterLink>

    <div class="grow" />
    <RouterLink to="/settings" class="me">
      <span class="ava">{{ journal.user ? journal.user.name.charAt(0) : '·' }}</span>
      <span>
        <b>{{ journal.user ? journal.user.name : 'Профиль' }}</b>
        <small>{{ journal.user ? journal.user.email : 'Войти или создать' }}</small>
      </span>
      <span style="color: var(--faint)">›</span>
    </RouterLink>
  </aside>
</template>
