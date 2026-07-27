import { createRouter, createWebHistory } from "vue-router";
import Layout from "./components/Layout.vue";
import HomeRedirect from "./components/HomeRedirect.vue";
import LibraryPage from "./pages/LibraryPage.vue";
import FeedPage from "./pages/FeedPage.vue";
import BookPage from "./pages/BookPage.vue";
import AddBookPage from "./pages/AddBookPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    // «/» открывает текущую читаемую книгу (или библиотеку, если книг нет)
    { path: "/", component: HomeRedirect },
    {
      path: "/",
      component: Layout,
      children: [
        { path: "library", component: LibraryPage },
        { path: "feed", component: FeedPage },
        { path: "book/:id", component: BookPage },
        { path: "add", component: AddBookPage },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
