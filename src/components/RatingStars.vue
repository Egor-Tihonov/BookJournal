<script setup lang="ts">
defineProps<{ rating: number }>()
</script>

<!-- Оценка книги звёздочками, только отображение (выставляется в ReviewModal). -->
<template>
  <span class="stars" :aria-label="`Оценка ${rating} из 5`">
    <i v-for="n in [1, 2, 3, 4, 5]" :key="n" :class="n <= rating ? undefined : 'off'">★</i>
  </span>
</template>
