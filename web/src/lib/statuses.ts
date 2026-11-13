// Статусы тикетов. Порядок совпадает с models.TicketStatuses на бэкенде (internal/models/models.go).
export const STATUSES = ["triage", "backlog", "todo", "in_progress", "ready_for_review", "done", "cancelled"];

export const STATUS_LABELS: Record<string, string> = {
  triage: "Needs decision",
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  ready_for_review: "Ready for Review",
  done: "Done",
  cancelled: "Cancelled",
};

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
