import { createApp } from "vue";
import { createPinia } from "pinia";
import vue3GoogleLogin from "vue3-google-login";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import App from "./App.vue";
import { router } from "./router";
import { useJournal } from "./stores/journal";
import { useSync } from "./stores/sync";
import { GOOGLE_CLIENT_ID } from "./config";

const app = createApp(App)
  .use(createPinia())
  .use(router)
  .use(vue3GoogleLogin, { clientId: GOOGLE_CLIENT_ID });
await useJournal().init();
// Без await — синхронизация с Drive не должна задерживать старт приложения.
useSync().init();

app.mount("#root");
