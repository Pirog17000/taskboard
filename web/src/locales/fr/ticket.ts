import type ru from "../ru/ticket";

const fr: Record<keyof typeof ru, string> = {
  "ticket.resizeLabel": "Modifier la largeur du panneau",
  "ticket.resizeHint": "Faites glisser pour changer la largeur. Un double-clic rétablit la largeur d'origine",
  "ticket.duplicateOf": "Doublon de {key}",

  "ticket.section.description": "Description",
  "ticket.section.questions": "Questions",
  "ticket.section.tags": "Tags",
  "ticket.section.properties": "Propriétés",
  "ticket.section.fields": "Champs",
  "ticket.section.dependencies": "Dépendances",
  "ticket.section.links": "Liens",
  "ticket.section.subtasks": "Sous-tâches",

  "ticket.descWrite": "Modifier",
  "ticket.descPreview": "Aperçu",
  "ticket.descPlaceholder": "Décrivez la tâche (Markdown accepté)…",
  "ticket.descEmpty": "Ajoutez une description…",

  "ticket.unanswered": "sans réponse : {count}",
  "ticket.answerPlaceholder": "Votre réponse…",
  "ticket.addQuestionPlaceholder": "Ajouter une question…",

  "ticket.removeTag": "Retirer le tag {name}",
  "ticket.addTagPlaceholder": "Ajouter un tag : Entrée ou virgule…",

  "ticket.status": "Statut",
  "ticket.priority": "Priorité",
  "ticket.dueDate": "Échéance",
  "ticket.team": "Équipe",
  "ticket.project": "Projet",
  "ticket.saveChanges": "Enregistrer les modifications",

  "ticket.fieldNamePlaceholder": "Champ (par exemple, class)",
  "ticket.fieldValuePlaceholder": "Valeur",

  "ticket.blocking": "bloque",
  "ticket.blockerDone": "terminé",
  "ticket.noBlockers": "Ce ticket n'est bloqué par aucun autre",
  "ticket.blockerPlaceholder": "Bloqué par le ticket (par exemple, UE-80)",

  "ticket.noLinks": "Aucun lien",
  "ticket.linkRelates": "lié à",
  "ticket.linkDuplicates": "est un doublon de",
  "ticket.linkPlaceholder": "Clé du ticket (par exemple, UE-80)",

  "ticket.addSubtaskPlaceholder": "Ajouter une sous-tâche…",

  "ticket.create.title": "Nouveau ticket",
  "ticket.create.project": "Projet",
  "ticket.create.selectProject": "Choisissez un projet…",
  "ticket.create.titleLabel": "Titre",
  "ticket.create.titlePlaceholder": "Que faut-il faire ?",
  "ticket.create.description": "Description",
  "ticket.create.descriptionPlaceholder": "Ajoutez des détails…",
  "ticket.create.priority": "Priorité",
  "ticket.create.dueDate": "Échéance",
  "ticket.create.team": "Équipe",
  "ticket.create.tags": "Tags",
  "ticket.create.tagsPlaceholder": "par exemple : première vague de travaux, étape 4 du plan 123",
  "ticket.create.submit": "Créer le ticket",
};

export default fr;
