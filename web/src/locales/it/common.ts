import type ru from "../ru/common";

const it: Record<keyof typeof ru, string> = {
  "status.triage": "In attesa di decisione",
  "status.backlog": "Backlog",
  "status.todo": "Da fare",
  "status.in_progress": "In corso",
  "status.ready_for_review": "In revisione",
  "status.done": "Fatto",
  "status.cancelled": "Annullato",

  "priority.urgent": "urgente",
  "priority.high": "alta",
  "priority.medium": "media",
  "priority.low": "bassa",

  "link.duplicateOf": "duplicato",
  "link.duplicatedBy": "ha un duplicato",
  "link.relatesTo": "correlato a",

  "common.save": "Salva",
  "common.cancel": "Annulla",
  "common.close": "Chiudi",
  "common.delete": "Elimina",
  "common.edit": "Modifica",
  "common.create": "Crea",
  "common.add": "Aggiungi",
  "common.loading": "Caricamento…",
  "common.none": "nessuno",
};

export default it;
