<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useJournal } from '../stores/journal'

const journal = useJournal()
const sync = ref(false)
</script>

<template>
  <section class="view">
    <div class="narrow">
      <RouterLink class="back" to="/library"> ‹ Библиотека </RouterLink>
      <h1>Профиль и настройки</h1>

      <div class="profile">
        <span class="ava">{{ journal.user ? journal.user.name.charAt(0) : '·' }}</span>
        <div style="flex: 1">
          <b>{{ journal.user ? journal.user.name : 'Профиль не настроен' }}</b>
          <small>{{ journal.user ? journal.user.email : 'Добавьте имя и почту' }}</small>
        </div>
        <button class="link" type="button">
          {{ journal.user ? 'Изменить' : 'Настроить' }}
        </button>
      </div>

      <div class="rows">
        <div class="srow">
          <div>
            <div class="v">Приватность</div>
            <div class="d">записи хранятся локально, офлайн-first</div>
          </div>
          <span class="r">включено ›</span>
        </div>
        <div class="srow">
          <div>
            <div class="v">Синхронизация</div>
            <div class="d">между устройствами, зашифрованно</div>
          </div>
          <button
            :class="sync ? 'toggle' : 'toggle off'"
            type="button"
            @click="sync = !sync"
            :aria-pressed="sync"
            aria-label="Синхронизация"
          ></button>
        </div>
        <div class="srow" style="opacity: 0.55">
          <div>
            <div class="v">Бэкап и экспорт</div>
            <div class="d">выгрузка дневника в файл</div>
          </div>
          <span
            class="r"
            style="border: 1px solid rgba(44, 34, 24, 0.18); padding: 3px 8px; border-radius: 5px"
          >
            позже
          </span>
        </div>
      </div>

      <RouterLink class="bj-btn ghost wide" to="/library" style="color: var(--muted)">
        {{ journal.user ? 'Выйти из аккаунта' : 'Войти в аккаунт' }}
      </RouterLink>
    </div>
  </section>
</template>
