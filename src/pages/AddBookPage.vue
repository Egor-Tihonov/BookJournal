<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useJournal } from "../stores/journal";
import { STATUS_META, STATUS_SEG_ORDER, type BookStatus } from "../types";

const router = useRouter();
const journal = useJournal();

const title = ref("");
const author = ref("");
const year = ref("");
const pages = ref("");

const status = ref<BookStatus>("want");
const reason = ref("");

const canSubmit = computed(() => title.value.trim().length > 0);

// Автофокус: фокус при монтировании элемента
const vFocus = {
    mounted: (el: HTMLElement) => el.focus(),
};

const submit = () => {
    if (!canSubmit.value) return;
    const book = journal.addBook({
        title: title.value,
        author: author.value,
        year: year.value ? Number(year.value) : undefined,
        pages: pages.value ? Number(pages.value) : undefined,
        status: status.value,
        reason: reason.value,
    });
    router.push(`/book/${book.id}`);
};
</script>

<template>
    <section class="view">
        <div class="narrow">
            <RouterLink class="back" to="/library"> ‹ Библиотека </RouterLink>
            <h1>Новая книга</h1>

            <div class="flabel">НАЗВАНИЕ</div>
            <input
                class="field"
                v-model="title"
                placeholder="Название книги…"
                v-focus
            />

            <div class="flabel">АВТОР</div>
            <input class="field" v-model="author" placeholder="Имя автора" />

            <div class="flabel">СТАТУС</div>
            <div class="seg">
                <div
                    v-for="s in STATUS_SEG_ORDER"
                    :key="s"
                    :class="status === s ? 'on' : undefined"
                    @click="status = s"
                >
                    {{ STATUS_META[s].label }}
                </div>
            </div>

            <div class="flabel">ПОЧЕМУ ДОБАВИЛ</div>
            <textarea
                placeholder="Пара слов на будущее — что зацепило, кто посоветовал…"
                v-model="reason"
            ></textarea>

            <button
                class="bj-btn wide"
                type="button"
                @click="submit"
                :disabled="!canSubmit"
            >
                Добавить в библиотеку
            </button>
        </div>
    </section>
</template>
