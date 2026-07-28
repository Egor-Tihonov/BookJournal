import { ref } from "vue";

// Состояние сайдбара общее для всего приложения (кнопка в TopBar, панель в Layout),
// поэтому ref живёт на уровне модуля. Выбор переживает перезагрузку.
const KEY = "bj-side";
const collapsed = ref(localStorage.getItem(KEY) === "hidden");

export function useSidebar() {
  const toggle = () => {
    collapsed.value = !collapsed.value;
    localStorage.setItem(KEY, collapsed.value ? "hidden" : "shown");
  };
  return { collapsed, toggle };
}
