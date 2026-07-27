<script setup lang="ts">
import { computed } from "vue";

interface CoverProps {
    gradient?: string;
}

const props = defineProps<CoverProps>();

// В gradient приходит либо CSS-градиент, либо картинка:
// внешний URL или data-URL (обложка, скачанная в IndexedDB)
const bg = computed(() => {
    if (!props.gradient) return undefined;
    const isImage = /^(https?:|data:)/.test(props.gradient);
    return {
        background: isImage
            ? `url(${props.gradient}) center/cover no-repeat`
            : props.gradient,
    };
});
</script>

<!-- Цветной корешок-обложка книги (`.cover .c`). Доп. class/style с места вызова
     доливаются автоматически через fallthrough-атрибуты. -->
<template>
    <span class="cover c" :style="bg"><slot /></span>
</template>
