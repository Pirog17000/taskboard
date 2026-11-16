import type { Ticket, TicketInput } from "../api/client";
import { CARD_FIELDS } from "./fields";
import { tagNames } from "./tags";

// ---------- Фильтры и сортировка доски ----------

export const PRIORITY_ORDER = ["urgent", "high", "medium", "low"];

export type SortKey = "manual" | "priority" | "due" | "updated" | "created" | "number" | "title" | "questions";

export const SORT_LABELS: Record<SortKey, string> = {
  manual: "ручному порядку",
  priority: "важности",
  due: "сроку",
  updated: "дате изменения",
  created: "дате создания",
  number: "номеру",
  title: "названию",
  questions: "числу вопросов без ответа",
};

export interface ViewFilters {
  priority: string; // "" = любая
  questions: "" | "open" | "none"; // есть / нет вопросов без ответа
  blocked: "" | "blocked" | "free"; // заблокирован / не заблокирован
  due: "" | "overdue" | "has" | "none"; // просрочен / есть срок / нет срока
  team: string; // id команды, "" = любая
  subtasks: "" | "open" | "none"; // есть незавершённые подзадачи / нет подзадач
}

export interface ViewSort {
  key: SortKey;
  desc: boolean;
}

export const EMPTY_FILTERS: ViewFilters = { priority: "", questions: "", blocked: "", due: "", team: "", subtasks: "" };
export const DEFAULT_SORT: ViewSort = { key: "manual", desc: false };

export function openQuestionCount(t: Ticket): number {
  return (t.questions || []).filter((q) => !q.answer.trim()).length;
}

export function activeFilterCount(f: ViewFilters): number {
  return Object.values(f).filter(Boolean).length;
}

export function matchesFilters(t: Ticket, f: ViewFilters, now = new Date()): boolean {
  if (f.priority && t.priority !== f.priority) return false;
  if (f.questions === "open" && openQuestionCount(t) === 0) return false;
  if (f.questions === "none" && openQuestionCount(t) > 0) return false;
  const blocked = (t.openBlockers ?? 0) > 0;
  if (f.blocked === "blocked" && !blocked) return false;
  if (f.blocked === "free" && blocked) return false;
  if (f.due === "has" && !t.dueDate) return false;
  if (f.due === "none" && t.dueDate) return false;
  if (f.due === "overdue") {
    if (!t.dueDate || new Date(t.dueDate).getTime() >= now.getTime()) return false;
    if (t.status === "done" || t.status === "cancelled") return false;
  }
  if (f.team && t.teamId !== f.team) return false;
  const openSubtasks = (t.subtasks || []).filter((s) => !s.completed).length;
  if (f.subtasks === "open" && openSubtasks === 0) return false;
  if (f.subtasks === "none" && (t.subtasks || []).length > 0) return false;
  return true;
}

function priorityRank(p: string): number {
  const i = PRIORITY_ORDER.indexOf(p);
  return i === -1 ? PRIORITY_ORDER.length : i;
}

// Сортировка внутри колонки. "manual" оставляет серверный порядок. Живые карточки всегда остаются сверху.
export function sortTickets(tickets: Ticket[], sort: ViewSort): Ticket[] {
  if (sort.key === "manual") return tickets;
  const dir = sort.desc ? -1 : 1;
  const cmp = (a: Ticket, b: Ticket): number => {
    switch (sort.key) {
      case "priority":
        return priorityRank(a.priority) - priorityRank(b.priority);
      case "due": {
        // Без срока всегда в конце, независимо от направления
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 2 * dir;
        if (!b.dueDate) return -2 * dir;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      case "updated":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "created":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "number":
        return a.number - b.number;
      case "title":
        return a.title.localeCompare(b.title, undefined, { numeric: true });
      case "questions":
        return openQuestionCount(b) - openQuestionCount(a);
      default:
        return 0;
    }
  };
  const live = tickets.filter((t) => t.kind === "live");
  const rest = tickets.filter((t) => t.kind !== "live");
  return [...live, ...rest.map((t, i) => ({ t, i })).sort((x, y) => cmp(x.t, y.t) * dir || x.i - y.i).map((x) => x.t)];
}

// ---------- Отображение на карточке ----------

export interface CardDisplay {
  showTags: boolean;
  // Явные переключатели полей: name -> показывать ли на карточке. Нет записи = по умолчанию (class и stage видны).
  fields: Record<string, boolean>;
}

export const DEFAULT_DISPLAY: CardDisplay = { showTags: true, fields: {} };

export function isFieldShown(name: string, display: CardDisplay): boolean {
  const explicit = display.fields[name];
  if (explicit !== undefined) return explicit;
  return (CARD_FIELDS as readonly string[]).includes(name);
}

// Все имена полей, встречающиеся на доске, плюс CARD_FIELDS и поля, у которых есть явная настройка.
export function boardFieldNames(tickets: Ticket[], display: CardDisplay): string[] {
  const set = new Set<string>(CARD_FIELDS);
  Object.keys(display.fields).forEach((n) => set.add(n));
  tickets.forEach((t) => Object.keys(t.fields || {}).forEach((n) => set.add(n)));
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// Поля, которые нужно нарисовать на карточке этого тикета.
export function cardFieldEntries(t: Ticket, display: CardDisplay): [string, string][] {
  return Object.entries(t.fields || {})
    .filter(([name, value]) => value && isFieldShown(name, display))
    .sort(([a], [b]) => a.localeCompare(b));
}

// ---------- Массовые операции ----------

export type BulkSource = { kind: "tag"; tag: string } | { kind: "field"; name: string; value: string }; // value "" = любое значение
export type BulkTarget =
  | { kind: "status"; status: string }
  | { kind: "priority"; priority: string }
  | { kind: "tag"; tag: string } // для источника-поля пустой tag = взять значение поля
  | { kind: "field"; name: string; value: string }; // для источника-тега пустой value = взять имя тега

export interface BulkOp {
  source: BulkSource;
  target: BulkTarget;
  removeSource: boolean; // убрать тег / поле после конвертации
}

export interface BulkPatch {
  status?: string;
  update?: TicketInput; // priority, labels (полный список имён)
  fields?: Record<string, string>; // пустая строка удаляет поле
}

export function sourceMatches(t: Ticket, s: BulkSource): boolean {
  if (s.kind === "tag") return !!s.tag && tagNames(t).includes(s.tag);
  const name = s.name.trim().toLowerCase();
  const v = t.fields?.[name];
  if (!name || !v) return false;
  return !s.value.trim() || v.toLowerCase() === s.value.trim().toLowerCase();
}

// Что нужно изменить в тикете; null — тикет не подходит под источник или менять нечего.
export function bulkPatch(t: Ticket, op: BulkOp): BulkPatch | null {
  if (t.kind === "live" || !sourceMatches(t, op.source)) return null;
  const patch: BulkPatch = {};
  let labels = tagNames(t);
  const fields: Record<string, string> = {};
  const srcValue = op.source.kind === "field" ? t.fields?.[op.source.name.trim().toLowerCase()] || "" : "";

  switch (op.target.kind) {
    case "status":
      if (op.target.status && op.target.status !== t.status) patch.status = op.target.status;
      break;
    case "priority":
      if (op.target.priority && op.target.priority !== t.priority) patch.update = { priority: op.target.priority };
      break;
    case "tag": {
      const tag = op.target.tag.trim() || srcValue;
      if (tag && !labels.includes(tag)) labels = [...labels, tag];
      break;
    }
    case "field": {
      const name = op.target.name.trim().toLowerCase();
      const value = op.target.value.trim() || (op.source.kind === "tag" ? op.source.tag : "");
      if (name && value) fields[name] = value;
      break;
    }
  }

  if (op.removeSource) {
    if (op.source.kind === "tag") labels = labels.filter((n) => n !== (op.source as { tag: string }).tag);
    else fields[op.source.name.trim().toLowerCase()] = "";
  }

  if (!sameList(labels, tagNames(t))) patch.update = { ...(patch.update || {}), labels };
  const changedFields = Object.entries(fields).filter(([k, v]) => (t.fields?.[k] || "") !== v);
  if (changedFields.length > 0) patch.fields = Object.fromEntries(changedFields);
  return patch.status || patch.update || patch.fields ? patch : null;
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
