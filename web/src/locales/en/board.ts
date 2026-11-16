import type ru from "../ru/board";

const en: Record<keyof typeof ru, string> = {
  "board.newTicket": "New ticket",
  "board.projectHint": "Which project to show on the board",
  "board.allProjects": "All projects",
  "board.search": "Search tickets…",
  "board.searchHint": "Searches by number, title and description",
  "board.filters": "Filters",
  "board.filtersAria": "Filters and sorting",
  "board.filtersHint": "Filters, ticket order and what to show on cards",
  "board.moreActions": "More actions",
  "board.bulkEdit": "Edit multiple tickets…",
  "board.bulkEditHint": "Status, priority, tag or field — applied to all matching tickets at once",
  "board.collapseEmpty": "Collapse empty columns",
  "board.collapseEmptyHint": "Columns that have no tickets",
  "board.loading": "Loading board…",

  "board.field.tag": "With tag",
  "board.field.class": "Class",
  "board.field.stage": "Stage",
  "board.anyTag": "any",
  "board.anyValue": "any",

  "board.addToColumn": "Add ticket to this column",
  "board.collapseColumn": "Collapse column",
  "board.expandColumn": "Expand column",
  "board.expandColumnNamed": "Expand column “{name}”",
  "board.dropHere": "Drop ticket here",
  "board.liveCount": "· live: {count}",

  "board.openQuestions": "Unanswered questions: {count}",
  "board.blockedHint": "Waiting for these tickets to be completed",
  "board.blockedBy": "waiting on: {keys}",
  "board.live.running": "RUNNING",
  "board.live.done": "DONE",
  "board.live.error": "ERROR",
};

export default en;
