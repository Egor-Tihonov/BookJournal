import { createApp } from "vue";
import { createPinia } from "pinia";
import vue3GoogleLogin from "vue3-google-login";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import App from "./App.vue";
import { router } from "./router";
import { useJournal } from "./stores/journal";
import { GOOGLE_CLIENT_ID } from "./services/googleDrive";

const app = createApp(App)
  .use(createPinia())
  .use(router)
  .use(vue3GoogleLogin, { clientId: GOOGLE_CLIENT_ID });
await useJournal().init();

app.mount("#root");
