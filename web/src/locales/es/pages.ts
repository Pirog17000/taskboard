import type ru from "../ru/pages";

const es: Record<keyof typeof ru, string> = {
  "pages.color": "Color",
  "pages.saveChanges": "Guardar cambios",

  "pages.projects.title": "Proyectos",
  "pages.projects.new": "Nuevo proyecto",
  "pages.projects.newTitle": "Nuevo proyecto",
  "pages.projects.editTitle": "Editar proyecto",
  "pages.projects.create": "Crear proyecto",
  "pages.projects.loading": "Cargando proyectos…",
  "pages.projects.empty": "Aún no hay proyectos",
  "pages.projects.name": "Nombre",
  "pages.projects.namePlaceholder": "Mi proyecto",
  "pages.projects.prefix": "Prefijo",
  "pages.projects.icon": "Icono",
  "pages.projects.description": "Descripción",
  "pages.projects.descriptionPlaceholder": "Se puede usar Markdown: objetivos, alcance y contexto del proyecto…",
  "pages.projects.status": "Estado",
  "pages.projects.statusActive": "Activo",
  "pages.projects.statusArchived": "Archivado",
  "pages.projects.showMore": "Mostrar todo",
  "pages.projects.showLess": "Contraer",

  "pages.teams.title": "Equipos",
  "pages.teams.new": "Nuevo equipo",
  "pages.teams.newTitle": "Nuevo equipo",
  "pages.teams.editTitle": "Editar equipo",
  "pages.teams.create": "Crear equipo",
  "pages.teams.loading": "Cargando equipos…",
  "pages.teams.empty": "Aún no hay equipos",
  "pages.teams.name": "Nombre",
  "pages.teams.namePlaceholder": "Desarrollo",
  "pages.teams.created": "Creado: {date}",

  "pages.tickets.title": "Tickets",
  "pages.tickets.new": "Nuevo ticket",
  "pages.tickets.colKey": "Clave",
  "pages.tickets.colTitle": "Título",
  "pages.tickets.colStatus": "Estado",
  "pages.tickets.colPriority": "Prioridad",
  "pages.tickets.colDue": "Fecha límite",
  "pages.tickets.allProjects": "Todos los proyectos",
  "pages.tickets.allStatuses": "Todos los estados",
  "pages.tickets.allPriorities": "Cualquier prioridad",
  "pages.tickets.allTags": "Todas las etiquetas",
  "pages.tickets.groupByTag": "Agrupar por etiquetas",
  "pages.tickets.count": "Tickets: {count}",
  "pages.tickets.loading": "Cargando tickets…",
  "pages.tickets.empty": "No se encontraron tickets",


  "pages.tags.none": "Sin etiqueta",

  "pages.fields.all_class": "Todas las clases",
  "pages.fields.all_stage": "Todas las etapas",

  "pages.api.error": "Error de API {status}: {text}",
};

export default es;
