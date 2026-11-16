import { t, type TKey } from "./i18n";

// Статусы тикетов. Порядок совпадает с models.TicketStatuses на бэкенде (internal/models/models.go).
export const STATUSES = ["triage", "backlog", "todo", "in_progress", "ready_for_review", "done", "cancelled"];

// Подпись статуса на текущем языке; неизвестный статус показывается как есть
export function statusLabel(status: string): string {
  return (STATUSES as string[]).includes(status) ? t(`status.${status}` as TKey) : status;
}

// Подпись важности на текущем языке
export function priorityLabel(priority: string): string {
  return ["urgent", "high", "medium", "low"].includes(priority) ? t(`priority.${priority}` as TKey) : priority;
}

export const STATUS_COLORS: Record<string, string> = {
  triage: "bg-fuchsia-500",
  backlog: "bg-indigo-400",
  todo: "bg-slate-500",
  in_progress: "bg-blue-500",
  ready_for_review: "bg-amber-500",
  done: "bg-green-500",
  cancelled: "bg-zinc-600",
};

export const STATUS_STYLES: Record<string, string> = {
  triage: "bg-fuchsia-500/20 text-fuchsia-400",
  backlog: "bg-indigo-500/20 text-indigo-300",
  todo: "bg-slate-500/20 text-slate-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  ready_for_review: "bg-amber-500/20 text-amber-400",
  done: "bg-green-500/20 text-green-400",
  cancelled: "bg-zinc-600/20 text-zinc-400",
};
