import type ru from "../ru/common";

const fr: Record<keyof typeof ru, string> = {
  "status.triage": "En attente de décision",
  "status.backlog": "Backlog",
  "status.todo": "À faire",
  "status.in_progress": "En cours",
  "status.ready_for_review": "En revue",
  "status.done": "Terminé",
  "status.cancelled": "Annulé",

  "priority.urgent": "urgente",
  "priority.high": "haute",
  "priority.medium": "moyenne",
  "priority.low": "basse",

  "link.duplicateOf": "doublon",
  "link.duplicatedBy": "a un doublon",
  "link.relatesTo": "lié à",

  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.close": "Fermer",
  "common.delete": "Supprimer",
  "common.edit": "Modifier",
  "common.create": "Créer",
  "common.add": "Ajouter",
  "common.loading": "Chargement…",
  "common.none": "aucun",
};

export default fr;
