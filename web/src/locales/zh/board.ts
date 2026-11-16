import type ru from "../ru/board";

const zh: Record<keyof typeof ru, string> = {
  "board.newTicket": "新建工单",
  "board.projectHint": "选择要在看板上显示的项目",
  "board.allProjects": "所有项目",
  "board.search": "搜索工单…",
  "board.searchHint": "按编号、标题和描述搜索",
  "board.filters": "筛选",
  "board.filtersAria": "筛选与排序",
  "board.filtersHint": "筛选条件、工单顺序以及卡片上显示的内容",
  "board.moreActions": "更多操作",
  "board.bulkEdit": "批量编辑工单…",
  "board.bulkEditHint": "状态、优先级、标签或字段，一次性应用于所有符合条件的工单",
  "board.collapseEmpty": "折叠空列",
  "board.collapseEmptyHint": "没有任何工单的列",
  "board.loading": "正在加载看板…",

  "board.field.tag": "带标签",
  "board.field.class": "类别",
  "board.field.stage": "阶段",
  "board.anyTag": "任意",
  "board.anyValue": "任意",

  "board.addToColumn": "在此列添加工单",
  "board.collapseColumn": "折叠列",
  "board.expandColumn": "展开列",
  "board.expandColumnNamed": "展开列「{name}」",
  "board.dropHere": "将工单拖到这里",
  "board.liveCount": "· 实时卡片：{count}",

  "board.openQuestions": "未回答的问题：{count}",
  "board.blockedHint": "等待这些工单完成",
  "board.blockedBy": "等待：{keys}",
  "board.live.running": "运行中",
  "board.live.done": "完成",
  "board.live.error": "出错",
};

export default zh;
