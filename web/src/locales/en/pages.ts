import type ru from "../ru/pages";

const en: Record<keyof typeof ru, string> = {
  "pages.color": "Color",
  "pages.saveChanges": "Save changes",

  "pages.projects.title": "Projects",
  "pages.projects.new": "New project",
  "pages.projects.newTitle": "New project",
  "pages.projects.editTitle": "Edit project",
  "pages.projects.create": "Create project",
  "pages.projects.loading": "Loading projects…",
  "pages.projects.empty": "No projects yet",
  "pages.projects.name": "Name",
  "pages.projects.namePlaceholder": "My project",
  "pages.projects.prefix": "Prefix",
  "pages.projects.icon": "Icon",
  "pages.projects.description": "Description",
  "pages.projects.descriptionPlaceholder": "Markdown is supported: goals, scope and project context…",
  "pages.projects.status": "Status",
  "pages.projects.statusActive": "Active",
  "pages.projects.statusArchived": "Archived",
  "pages.projects.showMore": "Show more",
  "pages.projects.showLess": "Show less",

  "pages.teams.title": "Teams",
  "pages.teams.new": "New team",
  "pages.teams.newTitle": "New team",
  "pages.teams.editTitle": "Edit team",
  "pages.teams.create": "Create team",
  "pages.teams.loading": "Loading teams…",
  "pages.teams.empty": "No teams yet",
  "pages.teams.name": "Name",
  "pages.teams.namePlaceholder": "Engineering",
  "pages.teams.created": "Created: {date}",

  "pages.tickets.title": "Tickets",
  "pages.tickets.new": "New ticket",
  "pages.tickets.colKey": "Key",
  "pages.tickets.colTitle": "Title",
  "pages.tickets.colStatus": "Status",
  "pages.tickets.colPriority": "Priority",
  "pages.tickets.colDue": "Due date",
  "pages.tickets.allProjects": "All projects",
  "pages.tickets.allStatuses": "All statuses",
  "pages.tickets.allPriorities": "Any priority",
  "pages.tickets.allTags": "All tags",
  "pages.tickets.groupByTag": "Group by tags",
  "pages.tickets.count": "Tickets: {count}",
  "pages.tickets.loading": "Loading tickets…",
  "pages.tickets.empty": "No tickets found",


  "pages.tags.none": "No tag",

  "pages.fields.all_class": "All classes",
  "pages.fields.all_stage": "All stages",

  "pages.api.error": "API error {status}: {text}",
};

export default en;
