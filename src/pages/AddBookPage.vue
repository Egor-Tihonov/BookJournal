<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useJournal } from "../stores/journal";
import { useModals } from "../stores/modals";
import { STATUS_META, STATUS_SEG_ORDER, type BookStatus } from "../types";
import {
    annotateRuTitles,
    downloadCover,
    searchCatalog,
    type CatalogBook,
} from "../data/catalog";
import { detectLang } from "../utils";
import Cover from "../components/Cover.vue";
import EmptyState from "../components/EmptyState.vue";

/** Два состояния страницы: поиск по каталогу / своя книга вручную. */
type Mode = "search" | "manual";

const router = useRouter();
const journal = useJournal();
const modals = useModals();

const mode = ref<Mode>("search");

// Поиск по каталогу
const query = ref("");
const selected = ref<CatalogBook | null>(null);

// Ручной ввод
const title = ref("");
const author = ref("");

const status = ref<BookStatus>("want");
const reason = ref("");

// Результаты появляются по кнопке «Поиск» (или Enter), не на каждый ввод
const results = ref<CatalogBook[]>([]);
const searched = ref(false);

// Листание выдачи
const PAGE_SIZE = 10;
const page = ref(0);
const pageCount = computed(() =>
    Math.ceil(results.value.length / PAGE_SIZE),
);
const pageBooks = computed(() =>
    results.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE),
);

// Переводы подгружаются только для видимой страницы (и только для русского запроса)
const translateVisible = () => {
    if (detectLang(query.value) === "ru") annotateRuTitles(pageBooks.value);
};

const loading = ref(false);

const doSearch = async () => {
    if (loading.value) return;
    selected.value = null;
    loading.value = true;
    try {
        results.value = await searchCatalog(query.value);
    } finally {
        loading.value = false;
    }
    page.value = 0;
    searched.value = true;
    translateVisible();
};

const goPage = (delta: number) => {
    page.value = Math.min(
        Math.max(page.value + delta, 0),
        pageCount.value - 1,
    );
    translateVisible();
};

const canSubmit = computed(() =>
    mode.value === "manual"
        ? title.value.trim().length > 0
        : selected.value !== null,
);

// Автофокус: фокус при монтировании элемента
const vFocus = {
    mounted: (el: HTMLElement) => el.focus(),
};

const setMode = (m: Mode) => {
    mode.value = m;
    // начатый, но не найденный поиск становится названием своей книги
    if (m === "manual" && !title.value) title.value = query.value;
};

const isSelected = (b: CatalogBook) =>
    selected.value !== null &&
    selected.value.title === b.title &&
    selected.value.author === b.author;

const submitting = ref(false);

const submit = async () => {
    if (!canSubmit.value || submitting.value) return;
    let base;
    if (mode.value === "manual") {
        base = { title: title.value, author: author.value };
    } else {
        const b = selected.value!;
        // обложку скачиваем один раз и храним локально (data-URL в IndexedDB);
        // если скачать не вышло — оставляем внешнюю ссылку
        submitting.value = true;
        let cover: string | undefined;
        try {
            // перевод названия мог не успеть подгрузиться — дотягиваем перед сохранением
            if (detectLang(query.value) === "ru") await annotateRuTitles([b]);
            cover = b.cover ? await downloadCover(b.cover) : undefined;
        } finally {
            submitting.value = false;
        }
        base = {
            title: b.title,
            titleRu: b.titleRu,
            author: b.author,
            cover: cover ?? b.cover,
        };
    }
    const book = journal.addBook({
        ...base,
        status: status.value,
        reason: reason.value,
    });
    // «Хочу читать» → в библиотеку; «Читаю» → на книгу;
    // «Прочитал» → на книгу + сразу модалка финального отзыва
    if (status.value === "want") {
        router.push("/library");
    } else {
        router.push(`/book/${book.id}`);
        if (status.value === "read") modals.openReview(book.id);
    }
};
</script>

<template>
    <section class="view">
        <div class="narrow">
            <RouterLink class="back" to="/library"> ‹ Библиотека </RouterLink>
            <h1>Добавить книгу</h1>

            <div class="seg">
                <div
                    :class="mode === 'search' ? 'on' : undefined"
                    @click="setMode('search')"
                >
                    Поиск книги
                </div>
                <div
                    :class="mode === 'manual' ? 'on' : undefined"
                    @click="setMode('manual')"
                >
                    Новая книга
                </div>
            </div>

            <template v-if="mode === 'search'">
                <div class="fieldrow">
                    <input
                        class="field"
                        type="search"
                        v-model="query"
                        placeholder="⌕  Поиск по названию или автору…"
                        v-focus
                        @keyup.enter="doSearch"
                    />
                    <button
                        class="bj-btn"
                        type="button"
                        :disabled="loading"
                        @click="doSearch"
                    >
                        Поиск
                    </button>
                </div>

                <div v-if="loading" class="bookload">
                    <div class="bk">
                        <span class="pg"></span>
                        <span class="pg"></span>
                        <span class="pg"></span>
                    </div>
                    Листаем каталог…
                </div>

                <EmptyState
                    v-else-if="searched && results.length === 0"
                    icon="⌕"
                    title="Ничего не нашлось"
                    text="Попробуйте другое написание — или добавьте книгу сами, вкладка «Новая книга»."
                >
                    <template #action>
                        <button
                            class="bj-btn ghost"
                            type="button"
                            @click="setMode('manual')"
                        >
                            Ввести вручную
                        </button>
                    </template>
                </EmptyState>

                <div v-else-if="results.length > 0" class="results">
                    <button
                        v-for="b in pageBooks"
                        :key="`${b.title}-${b.author}`"
                        type="button"
                        :class="isSelected(b) ? 'res on' : 'res'"
                        @click="selected = b"
                    >
                        <Cover :gradient="b.cover" />
                        <div>
                            <b>{{
                                b.titleRu
                                    ? `${b.title} (${b.titleRu})`
                                    : b.title
                            }}</b>
                            <small>{{ b.author }}</small>
                        </div>
                        <span
                            v-if="isSelected(b)"
                            class="link"
                            style="margin-left: auto"
                        >
                            выбрано ✓
                        </span>
                    </button>
                </div>

                <div v-if="!loading && pageCount > 1" class="pager">
                    <button
                        class="bj-btn ghost"
                        type="button"
                        :disabled="page === 0"
                        @click="goPage(-1)"
                    >
                        ‹ Назад
                    </button>
                    <span class="pageinfo">{{ page + 1 }} / {{ pageCount }}</span>
                    <button
                        class="bj-btn ghost"
                        type="button"
                        :disabled="page === pageCount - 1"
                        @click="goPage(1)"
                    >
                        Вперёд ›
                    </button>
                </div>
            </template>
            <template v-else>
                <div class="flabel">НАЗВАНИЕ</div>
                <input
                    class="field"
                    v-model="title"
                    placeholder="Название книги…"
                    v-focus
                />

                <div class="flabel">АВТОР</div>
                <input
                    class="field"
                    v-model="author"
                    placeholder="Имя автора"
                />
            </template>

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

            <div class="flabel">ПОЧЕМУ ДОБАВИЛ · ДО 250 СИМВОЛОВ</div>
            <textarea
                placeholder="Пара слов на будущее — что зацепило, кто посоветовал…"
                v-model="reason"
                maxlength="250"
            ></textarea>

            <button
                class="bj-btn wide"
                type="button"
                @click="submit"
                :disabled="!canSubmit || submitting"
            >
                {{ submitting ? "Сохраняем…" : "Добавить в библиотеку" }}
            </button>
        </div>
    </section>
</template>
