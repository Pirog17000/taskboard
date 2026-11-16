import type ru from "../ru/ticket";

const en: Record<keyof typeof ru, string> = {
  "ticket.resizeLabel": "Resize panel",
  "ticket.resizeHint": "Drag to change the width. Double-click to restore the original width",
  "ticket.duplicateOf": "Duplicate of {key}",

  "ticket.section.description": "Description",
  "ticket.section.questions": "Questions",
  "ticket.section.tags": "Tags",
  "ticket.section.properties": "Properties",
  "ticket.section.fields": "Fields",
  "ticket.section.dependencies": "Dependencies",
  "ticket.section.links": "Links",
  "ticket.section.subtasks": "Subtasks",

  "ticket.descWrite": "Edit",
  "ticket.descPreview": "Preview",
  "ticket.descPlaceholder": "Describe the task (Markdown is supported)…",
  "ticket.descEmpty": "Add a description…",

  "ticket.unanswered": "unanswered: {count}",
  "ticket.answerPlaceholder": "Your answer…",
  "ticket.addQuestionPlaceholder": "Add a question…",

  "ticket.removeTag": "Remove tag {name}",
  "ticket.addTagPlaceholder": "Add a tag: Enter or comma…",

  "ticket.status": "Status",
  "ticket.priority": "Priority",
  "ticket.dueDate": "Due date",
  "ticket.team": "Team",
  "ticket.project": "Project",
  "ticket.saveChanges": "Save changes",

  "ticket.fieldNamePlaceholder": "Field (e.g. class)",
  "ticket.fieldValuePlaceholder": "Value",

  "ticket.blocking": "blocking",
  "ticket.blockerDone": "done",
  "ticket.noBlockers": "This ticket is not blocked by anything",
  "ticket.blockerPlaceholder": "Blocked by ticket (e.g. UE-80)",

  "ticket.noLinks": "No links",
  "ticket.linkRelates": "relates to",
  "ticket.linkDuplicates": "is a duplicate of",
  "ticket.linkPlaceholder": "Ticket key (e.g. UE-80)",

  "ticket.addSubtaskPlaceholder": "Add a subtask…",

  "ticket.create.title": "New ticket",
  "ticket.create.project": "Project",
  "ticket.create.selectProject": "Select a project…",
  "ticket.create.titleLabel": "Title",
  "ticket.create.titlePlaceholder": "What needs to be done?",
  "ticket.create.description": "Description",
  "ticket.create.descriptionPlaceholder": "Add details…",
  "ticket.create.priority": "Priority",
  "ticket.create.dueDate": "Due date",
  "ticket.create.team": "Team",
  "ticket.create.tags": "Tags",
  "ticket.create.tagsPlaceholder": "e.g. first wave of work, stage 4 per plan 123",
  "ticket.create.submit": "Create ticket",
};

export default en;
