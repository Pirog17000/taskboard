import type ru from "../ru/common";

const es: Record<keyof typeof ru, string> = {
  "status.triage": "Pendiente de decisión",
  "status.backlog": "Backlog",
  "status.todo": "Por hacer",
  "status.in_progress": "En curso",
  "status.ready_for_review": "En revisión",
  "status.done": "Hecho",
  "status.cancelled": "Cancelado",

  "priority.urgent": "urgente",
  "priority.high": "alta",
  "priority.medium": "media",
  "priority.low": "baja",

  "link.duplicateOf": "duplicado",
  "link.duplicatedBy": "tiene duplicado",
  "link.relatesTo": "relacionado con",

  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.close": "Cerrar",
  "common.delete": "Eliminar",
  "common.edit": "Editar",
  "common.create": "Crear",
  "common.add": "Añadir",
  "common.loading": "Cargando…",
  "common.none": "ninguno",
};

export default es;
