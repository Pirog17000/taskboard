import { useSyncExternalStore } from "react";
import ru from "../locales/ru";
import en from "../locales/en";
import fr from "../locales/fr";
import es from "../locales/es";
import it from "../locales/it";
import zh from "../locales/zh";

// Лёгкая локализация без зависимостей.
// Русский словарь — исходный: в нём есть все ключи, остальные языки переводят его и при пропуске падают на русский.
// Ключи плоские, с пространством имён: "board.newTicket". Подстановки: t("bulk.matching", { count: 3 }) → "{count}".

export type TKey = keyof typeof ru;
export type Dict = Record<TKey, string>;

export const LANGUAGES = [
  { code: "ru", name: "Русский", locale: "ru-RU" },
  { code: "en", name: "English", locale: "en-US" },
  { code: "fr", name: "Français", locale: "fr-FR" },
  { code: "es", name: "Español", locale: "es-ES" },
  { code: "it", name: "Italiano", locale: "it-IT" },
  { code: "zh", name: "中文", locale: "zh-CN" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];

const DICTS: Record<Lang, Partial<Dict>> = { ru, en, fr, es, it, zh };
const STORAGE_KEY = "taskboard.lang";

function detect(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  // Пока язык не выбран в настройках — русский, чтобы интерфейс не менялся сам от языка браузера
  return saved && saved in DICTS ? (saved as Lang) : "ru";
}

let current: Lang = detect();
document.documentElement.lang = current;
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Текущий язык как состояние React: компонент перерисуется при смене языка
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang);
}

export function t(key: TKey, vars?: Record<string, string | number>): string {
  const text = DICTS[current][key] ?? ru[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

// Локаль для дат и чисел (toLocaleDateString и т. п.)
export function getLocale(): string {
  return LANGUAGES.find((l) => l.code === current)?.locale ?? "ru-RU";
}

export function formatDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString(getLocale());
}
