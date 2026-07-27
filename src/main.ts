import { createApp } from "vue";
import { createPinia } from "pinia";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import App from "./App.vue";
import { router } from "./router";
import { useJournal } from "./stores/journal";

const app = createApp(App).use(createPinia()).use(router);
await useJournal().init();

app.mount("#root");
