import type { Ticket } from "../api/client";

// Поля, которые показываются на карточке и доступны как быстрые фильтры; остальные видны в панели тикета.
export const CARD_FIELDS = ["class", "stage"] as const;

export const FIELD_FILTER_LABELS: Record<string, string> = {
  class: "Все классы",
  stage: "Все стадии",
};

export function ticketKey(ticket: Ticket): string {
  return `${ticket.projectPrefix}-${ticket.number}`;
}

// Подстрока без учёта регистра в ключе, заголовке или описании.
export function matchesSearch(ticket: Ticket, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    ticketKey(ticket).toLowerCase().includes(q) ||
    ticket.title.toLowerCase().includes(q) ||
    (ticket.description || "").toLowerCase().includes(q)
  );
}

// Уникальные значения поля среди тикетов, с учётом чисел («2» раньше «10»).
export function fieldValues(tickets: Ticket[], name: string): string[] {
  const set = new Set<string>();
  tickets.forEach((t) => {
    const v = t.fields?.[name];
    if (v) set.add(v);
  });
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
