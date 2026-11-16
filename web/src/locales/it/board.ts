import type ru from "../ru/board";

const it: Record<keyof typeof ru, string> = {
  "board.newTicket": "Nuovo ticket",
  "board.projectHint": "Quale progetto mostrare in bacheca",
  "board.allProjects": "Tutti i progetti",
  "board.search": "Cerca ticket…",
  "board.searchHint": "Cerca per numero, titolo e descrizione",
  "board.filters": "Filtri",
  "board.filtersAria": "Filtri e ordinamento",
  "board.filtersHint": "Filtri, ordine dei ticket e cosa mostrare sulle schede",
  "board.moreActions": "Altre azioni",
  "board.bulkEdit": "Modifica più ticket…",
  "board.bulkEditHint": "Stato, priorità, tag o campo, subito per tutti quelli adatti",
  "board.collapseEmpty": "Comprimi le colonne vuote",
  "board.collapseEmptyHint": "Colonne che non contengono nessun ticket",
  "board.loading": "Caricamento bacheca…",

  "board.field.tag": "Con tag",
  "board.field.class": "Classe",
  "board.field.stage": "Fase",
  "board.anyTag": "qualsiasi",
  "board.anyValue": "qualsiasi",

  "board.addToColumn": "Aggiungi un ticket a questa colonna",
  "board.collapseColumn": "Comprimi colonna",
  "board.expandColumn": "Espandi colonna",
  "board.expandColumnNamed": "Espandi colonna «{name}»",
  "board.dropHere": "Trascina qui il ticket",
  "board.liveCount": "· attivi: {count}",

  "board.openQuestions": "Domande senza risposta: {count}",
  "board.blockedHint": "In attesa del completamento di questi ticket",
  "board.blockedBy": "in attesa di: {keys}",
  "board.live.running": "IN CORSO",
  "board.live.done": "FATTO",
  "board.live.error": "ERRORE",
};

export default it;
