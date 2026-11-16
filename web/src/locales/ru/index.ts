// Исходный словарь: все ключи интерфейса. Пространства имён лежат в отдельных файлах.
import common from "./common";
import board from "./board";
import menus from "./menus";
import ticket from "./ticket";
import pages from "./pages";

export default {
  ...common,
  ...board,
  ...menus,
  ...ticket,
  ...pages,
};
