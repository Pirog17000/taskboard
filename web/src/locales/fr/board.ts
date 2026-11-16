import type ru from "../ru/board";

const fr: Record<keyof typeof ru, string> = {
  "board.newTicket": "Nouveau ticket",
  "board.projectHint": "Projet à afficher sur le tableau",
  "board.allProjects": "Tous les projets",
  "board.search": "Rechercher un ticket…",
  "board.searchHint": "Recherche par numéro, titre et description",
  "board.filters": "Filtres",
  "board.filtersAria": "Filtres et tri",
  "board.filtersHint": "Filtres, ordre des tickets et informations affichées sur les cartes",
  "board.moreActions": "Autres actions",
  "board.bulkEdit": "Modifier plusieurs tickets…",
  "board.bulkEditHint": "Statut, priorité, tag ou champ, pour tous les tickets concernés d'un coup",
  "board.collapseEmpty": "Réduire les colonnes vides",
  "board.collapseEmptyHint": "Colonnes qui ne contiennent aucun ticket",
  "board.loading": "Chargement du tableau…",

  "board.field.tag": "Avec le tag",
  "board.field.class": "Classe",
  "board.field.stage": "Étape",
  "board.anyTag": "n'importe lequel",
  "board.anyValue": "n'importe laquelle",

  "board.addToColumn": "Ajouter un ticket à cette colonne",
  "board.collapseColumn": "Réduire la colonne",
  "board.expandColumn": "Développer la colonne",
  "board.expandColumnNamed": "Développer la colonne « {name} »",
  "board.dropHere": "Glissez le ticket ici",
  "board.liveCount": "· en direct : {count}",

  "board.openQuestions": "Questions sans réponse : {count}",
  "board.blockedHint": "En attente de la fin de ces tickets",
  "board.blockedBy": "en attente : {keys}",
  "board.live.running": "EN COURS",
  "board.live.done": "TERMINÉ",
  "board.live.error": "ERREUR",
};

export default fr;
