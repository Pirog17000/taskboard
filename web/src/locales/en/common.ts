import type ru from "../ru/common";

const en: Record<keyof typeof ru, string> = {
  "status.triage": "Needs decision",
  "status.backlog": "Backlog",
  "status.todo": "To do",
  "status.in_progress": "In progress",
  "status.ready_for_review": "In review",
  "status.done": "Done",
  "status.cancelled": "Cancelled",

  "priority.urgent": "urgent",
  "priority.high": "high",
  "priority.medium": "medium",
  "priority.low": "low",

  "link.duplicateOf": "duplicate of",
  "link.duplicatedBy": "has duplicate",
  "link.relatesTo": "relates to",

  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.create": "Create",
  "common.add": "Add",
  "common.loading": "Loading…",
  "common.none": "none",
};

export default en;
