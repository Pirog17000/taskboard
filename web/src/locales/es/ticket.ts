import type ru from "../ru/ticket";

const es: Record<keyof typeof ru, string> = {
  "ticket.resizeLabel": "Cambiar ancho del panel",
  "ticket.resizeHint": "Arrastra para cambiar el ancho. Doble clic restaura el ancho original",
  "ticket.duplicateOf": "Duplicado de {key}",

  "ticket.section.description": "Descripción",
  "ticket.section.questions": "Preguntas",
  "ticket.section.tags": "Etiquetas",
  "ticket.section.properties": "Propiedades",
  "ticket.section.fields": "Campos",
  "ticket.section.dependencies": "Dependencias",
  "ticket.section.links": "Enlaces",
  "ticket.section.subtasks": "Subtareas",

  "ticket.descWrite": "Editar",
  "ticket.descPreview": "Vista previa",
  "ticket.descPlaceholder": "Describe la tarea (se puede usar Markdown)…",
  "ticket.descEmpty": "Añade una descripción…",

  "ticket.unanswered": "sin respuesta: {count}",
  "ticket.answerPlaceholder": "Tu respuesta…",
  "ticket.addQuestionPlaceholder": "Añadir pregunta…",

  "ticket.removeTag": "Quitar etiqueta {name}",
  "ticket.addTagPlaceholder": "Añadir etiqueta: Enter o coma…",

  "ticket.status": "Estado",
  "ticket.priority": "Prioridad",
  "ticket.dueDate": "Fecha límite",
  "ticket.team": "Equipo",
  "ticket.project": "Proyecto",
  "ticket.saveChanges": "Guardar cambios",

  "ticket.fieldNamePlaceholder": "Campo (por ejemplo, class)",
  "ticket.fieldValuePlaceholder": "Valor",

  "ticket.blocking": "bloquea",
  "ticket.blockerDone": "hecho",
  "ticket.noBlockers": "El ticket no está bloqueado por nada",
  "ticket.blockerPlaceholder": "Bloqueado por el ticket (por ejemplo, UE-80)",

  "ticket.noLinks": "No hay enlaces",
  "ticket.linkRelates": "relacionado con",
  "ticket.linkDuplicates": "es duplicado de",
  "ticket.linkPlaceholder": "Clave del ticket (por ejemplo, UE-80)",

  "ticket.addSubtaskPlaceholder": "Añadir subtarea…",

  "ticket.create.title": "Nuevo ticket",
  "ticket.create.project": "Proyecto",
  "ticket.create.selectProject": "Elige un proyecto…",
  "ticket.create.titleLabel": "Título",
  "ticket.create.titlePlaceholder": "¿Qué hay que hacer?",
  "ticket.create.description": "Descripción",
  "ticket.create.descriptionPlaceholder": "Añade detalles…",
  "ticket.create.priority": "Prioridad",
  "ticket.create.dueDate": "Fecha límite",
  "ticket.create.team": "Equipo",
  "ticket.create.tags": "Etiquetas",
  "ticket.create.tagsPlaceholder": "por ejemplo: primera ola de trabajo, etapa 4 según el plan 123",
  "ticket.create.submit": "Crear ticket",
};

export default es;
