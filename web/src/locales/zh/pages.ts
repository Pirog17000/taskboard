import type ru from "../ru/pages";

const zh: Record<keyof typeof ru, string> = {
  "pages.color": "颜色",
  "pages.saveChanges": "保存更改",

  "pages.projects.title": "项目",
  "pages.projects.new": "新建项目",
  "pages.projects.newTitle": "新建项目",
  "pages.projects.editTitle": "编辑项目",
  "pages.projects.create": "创建项目",
  "pages.projects.loading": "正在加载项目…",
  "pages.projects.empty": "暂无项目",
  "pages.projects.name": "名称",
  "pages.projects.namePlaceholder": "我的项目",
  "pages.projects.prefix": "前缀",
  "pages.projects.icon": "图标",
  "pages.projects.description": "描述",
  "pages.projects.descriptionPlaceholder": "支持 Markdown：项目目标、范围和背景…",
  "pages.projects.status": "状态",
  "pages.projects.statusActive": "进行中",
  "pages.projects.statusArchived": "已归档",
  "pages.projects.showMore": "显示全部",
  "pages.projects.showLess": "收起",

  "pages.teams.title": "团队",
  "pages.teams.new": "新建团队",
  "pages.teams.newTitle": "新建团队",
  "pages.teams.editTitle": "编辑团队",
  "pages.teams.create": "创建团队",
  "pages.teams.loading": "正在加载团队…",
  "pages.teams.empty": "暂无团队",
  "pages.teams.name": "名称",
  "pages.teams.namePlaceholder": "研发",
  "pages.teams.created": "创建于：{date}",

  "pages.tickets.title": "工单",
  "pages.tickets.new": "新建工单",
  "pages.tickets.colKey": "编号",
  "pages.tickets.colTitle": "标题",
  "pages.tickets.colStatus": "状态",
  "pages.tickets.colPriority": "优先级",
  "pages.tickets.colDue": "截止日期",
  "pages.tickets.allProjects": "所有项目",
  "pages.tickets.allStatuses": "所有状态",
  "pages.tickets.allPriorities": "任意优先级",
  "pages.tickets.allTags": "所有标签",
  "pages.tickets.groupByTag": "按标签分组",
  "pages.tickets.count": "工单数：{count}",
  "pages.tickets.loading": "正在加载工单…",
  "pages.tickets.empty": "未找到工单",


  "pages.tags.none": "无标签",

  "pages.fields.all_class": "所有类别",
  "pages.fields.all_stage": "所有阶段",

  "pages.api.error": "API 错误 {status}：{text}",
};

export default zh;
