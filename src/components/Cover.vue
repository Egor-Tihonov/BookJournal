<script setup lang="ts">
import { computed } from "vue";

interface CoverProps {
    gradient?: string;
}

const props = defineProps<CoverProps>();

const bg = computed(() =>
    props.gradient ? { background: props.gradient } : undefined,
);
</script>

<!-- Цветной корешок-обложка книги (`.cover .c`). Доп. class/style с места вызова
     доливаются автоматически через fallthrough-атрибуты. -->
<template>
    <span class="cover c" :style="bg"><slot /></span>
</template>
