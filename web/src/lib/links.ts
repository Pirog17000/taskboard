import type { Ticket } from "../api/client";
import { t } from "./i18n";

// Label of a link as read from the ticket that holds it: "duplicate of", "duplicated by" or "relates to".
export function linkLabel(link: { type: string; direction?: string }): string {
  if (link.type === "duplicates") return link.direction === "in" ? t("link.duplicatedBy") : t("link.duplicateOf");
  return t("link.relatesTo");
}

// Keys of the tickets this ticket duplicates (the ticket is marked as a duplicate of them).
export function duplicateOfKeys(ticket: Ticket): string[] {
  return (ticket.links || []).filter((l) => l.type === "duplicates" && l.direction === "out").map((l) => l.key);
}
