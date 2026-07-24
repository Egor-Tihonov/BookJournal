<script setup lang="ts">
interface EmptyStateProps {
  icon?: string
  title: string
  text?: string
}

withDefaults(defineProps<EmptyStateProps>(), { icon: '✦' })
</script>

<!-- Единое оформление пустых состояний (нет данных — место под реальный контент).
     Кнопка/ссылка действия передаётся через слот `action` (бывший проп `action`),
     иконку можно переопределить пропом `icon` или слотом `icon`. -->
<template>
  <div class="empty">
    <div class="ic"><slot name="icon">{{ icon }}</slot></div>
    <h3>{{ title }}</h3>
    <p v-if="text">{{ text }}</p>
    <slot name="action" />
  </div>
</template>
