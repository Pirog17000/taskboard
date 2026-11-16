import type ru from "../ru/ticket";

const it: Record<keyof typeof ru, string> = {
  "ticket.resizeLabel": "Cambia la larghezza del pannello",
  "ticket.resizeHint": "Trascina per cambiare la larghezza. Il doppio clic ripristina la larghezza originale",
  "ticket.duplicateOf": "Duplicato di {key}",

  "ticket.section.description": "Descrizione",
  "ticket.section.questions": "Domande",
  "ticket.section.tags": "Tag",
  "ticket.section.properties": "Proprietà",
  "ticket.section.fields": "Campi",
  "ticket.section.dependencies": "Dipendenze",
  "ticket.section.links": "Collegamenti",
  "ticket.section.subtasks": "Sottoattività",

  "ticket.descWrite": "Modifica",
  "ticket.descPreview": "Anteprima",
  "ticket.descPlaceholder": "Descrivi l'attività (è possibile usare Markdown)…",
  "ticket.descEmpty": "Aggiungi una descrizione…",

  "ticket.unanswered": "senza risposta: {count}",
  "ticket.answerPlaceholder": "La tua risposta…",
  "ticket.addQuestionPlaceholder": "Aggiungi una domanda…",

  "ticket.removeTag": "Rimuovi il tag {name}",
  "ticket.addTagPlaceholder": "Aggiungi tag: Invio o virgola…",

  "ticket.status": "Stato",
  "ticket.priority": "Priorità",
  "ticket.dueDate": "Scadenza",
  "ticket.team": "Team",
  "ticket.project": "Progetto",
  "ticket.saveChanges": "Salva modifiche",

  "ticket.fieldNamePlaceholder": "Campo (ad esempio class)",
  "ticket.fieldValuePlaceholder": "Valore",

  "ticket.blocking": "blocca",
  "ticket.blockerDone": "completato",
  "ticket.noBlockers": "Il ticket non è bloccato da nessun altro ticket",
  "ticket.blockerPlaceholder": "Bloccato dal ticket (ad esempio UE-80)",

  "ticket.noLinks": "Nessun collegamento",
  "ticket.linkRelates": "correlato a",
  "ticket.linkDuplicates": "è un duplicato di",
  "ticket.linkPlaceholder": "Chiave del ticket (ad esempio UE-80)",

  "ticket.addSubtaskPlaceholder": "Aggiungi una sottoattività…",

  "ticket.create.title": "Nuovo ticket",
  "ticket.create.project": "Progetto",
  "ticket.create.selectProject": "Scegli un progetto…",
  "ticket.create.titleLabel": "Titolo",
  "ticket.create.titlePlaceholder": "Cosa va fatto?",
  "ticket.create.description": "Descrizione",
  "ticket.create.descriptionPlaceholder": "Aggiungi dettagli…",
  "ticket.create.priority": "Priorità",
  "ticket.create.dueDate": "Scadenza",
  "ticket.create.team": "Team",
  "ticket.create.tags": "Tag",
  "ticket.create.tagsPlaceholder": "ad esempio: prima ondata di lavori, fase 4 secondo il piano 123",
  "ticket.create.submit": "Crea ticket",
};

export default it;
