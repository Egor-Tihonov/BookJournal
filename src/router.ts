import { createRouter, createWebHistory } from "vue-router";
import Layout from "./components/Layout.vue";
import HomeRedirect from "./components/HomeRedirect.vue";
import LibraryPage from "./pages/LibraryPage.vue";
import FeedPage from "./pages/FeedPage.vue";
import BookPage from "./pages/BookPage.vue";
import AddBookPage from "./pages/AddBookPage.vue";
import ShelfPage from "./pages/ShelfPage.vue";

export const router = createRouter({
  // база берётся из vite (base в vite.config.ts) — в деве "/", на Pages "/BookJournal/"
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // «/» открывает текущую читаемую книгу (или библиотеку, если книг нет)
    { path: "/", component: HomeRedirect },
    {
      path: "/",
      component: Layout,
      children: [
        { path: "library", component: LibraryPage },
        { path: "library/shelf/:status", component: ShelfPage },
        { path: "feed", component: FeedPage },
        { path: "book/:id", component: BookPage },
        { path: "add", component: AddBookPage },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
