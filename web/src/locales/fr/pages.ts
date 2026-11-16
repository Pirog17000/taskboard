import type ru from "../ru/pages";

const fr: Record<keyof typeof ru, string> = {
  "pages.color": "Couleur",
  "pages.saveChanges": "Enregistrer les modifications",

  "pages.projects.title": "Projets",
  "pages.projects.new": "Nouveau projet",
  "pages.projects.newTitle": "Nouveau projet",
  "pages.projects.editTitle": "Modifier le projet",
  "pages.projects.create": "Créer le projet",
  "pages.projects.loading": "Chargement des projets…",
  "pages.projects.empty": "Aucun projet pour le moment",
  "pages.projects.name": "Nom",
  "pages.projects.namePlaceholder": "Mon projet",
  "pages.projects.prefix": "Préfixe",
  "pages.projects.icon": "Icône",
  "pages.projects.description": "Description",
  "pages.projects.descriptionPlaceholder": "Markdown accepté : objectifs, périmètre et contexte du projet…",
  "pages.projects.status": "État",
  "pages.projects.statusActive": "Actif",
  "pages.projects.statusArchived": "Archivé",
  "pages.projects.showMore": "Afficher tout",
  "pages.projects.showLess": "Réduire",

  "pages.teams.title": "Équipes",
  "pages.teams.new": "Nouvelle équipe",
  "pages.teams.newTitle": "Nouvelle équipe",
  "pages.teams.editTitle": "Modifier l'équipe",
  "pages.teams.create": "Créer l'équipe",
  "pages.teams.loading": "Chargement des équipes…",
  "pages.teams.empty": "Aucune équipe pour le moment",
  "pages.teams.name": "Nom",
  "pages.teams.namePlaceholder": "Développement",
  "pages.teams.created": "Créée : {date}",

  "pages.tickets.title": "Tickets",
  "pages.tickets.new": "Nouveau ticket",
  "pages.tickets.colKey": "Clé",
  "pages.tickets.colTitle": "Titre",
  "pages.tickets.colStatus": "Statut",
  "pages.tickets.colPriority": "Priorité",
  "pages.tickets.colDue": "Échéance",
  "pages.tickets.allProjects": "Tous les projets",
  "pages.tickets.allStatuses": "Tous les statuts",
  "pages.tickets.allPriorities": "Toutes les priorités",
  "pages.tickets.allTags": "Tous les tags",
  "pages.tickets.groupByTag": "Regrouper par tag",
  "pages.tickets.count": "Tickets : {count}",
  "pages.tickets.loading": "Chargement des tickets…",
  "pages.tickets.empty": "Aucun ticket trouvé",


  "pages.tags.none": "Sans tag",

  "pages.fields.all_class": "Toutes les classes",
  "pages.fields.all_stage": "Toutes les étapes",

  "pages.api.error": "Erreur API {status} : {text}",
};

export default fr;
