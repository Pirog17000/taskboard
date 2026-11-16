import type ru from "../ru/board";

const es: Record<keyof typeof ru, string> = {
  "board.newTicket": "Nuevo ticket",
  "board.projectHint": "Qué proyecto mostrar en el tablero",
  "board.allProjects": "Todos los proyectos",
  "board.search": "Buscar ticket…",
  "board.searchHint": "Busca por número, título y descripción",
  "board.filters": "Filtros",
  "board.filtersAria": "Filtros y orden",
  "board.filtersHint": "Filtros, orden de los tickets y qué mostrar en las tarjetas",
  "board.moreActions": "Más acciones",
  "board.bulkEdit": "Editar varios tickets…",
  "board.bulkEditHint": "Estado, prioridad, etiqueta o campo, de una vez en todos los que coincidan",
  "board.collapseEmpty": "Contraer columnas vacías",
  "board.collapseEmptyHint": "Columnas que no tienen ningún ticket",
  "board.loading": "Cargando tablero…",

  "board.field.tag": "Con etiqueta",
  "board.field.class": "Clase",
  "board.field.stage": "Etapa",
  "board.anyTag": "cualquiera",
  "board.anyValue": "cualquiera",

  "board.addToColumn": "Añadir ticket a esta columna",
  "board.collapseColumn": "Contraer columna",
  "board.expandColumn": "Expandir columna",
  "board.expandColumnNamed": "Expandir columna «{name}»",
  "board.dropHere": "Suelta el ticket aquí",
  "board.liveCount": "· activos: {count}",

  "board.openQuestions": "Preguntas sin respuesta: {count}",
  "board.blockedHint": "Espera a que terminen estos tickets",
  "board.blockedBy": "espera: {keys}",
  "board.live.running": "EN CURSO",
  "board.live.done": "HECHO",
  "board.live.error": "ERROR",
};

export default es;
