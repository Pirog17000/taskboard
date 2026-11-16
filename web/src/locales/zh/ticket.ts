import type ru from "../ru/ticket";

const zh: Record<keyof typeof ru, string> = {
  "ticket.resizeLabel": "调整面板宽度",
  "ticket.resizeHint": "拖动以调整宽度，双击恢复原始宽度",
  "ticket.duplicateOf": "重复项：{key}",

  "ticket.section.description": "描述",
  "ticket.section.questions": "问题",
  "ticket.section.tags": "标签",
  "ticket.section.properties": "属性",
  "ticket.section.fields": "字段",
  "ticket.section.dependencies": "依赖关系",
  "ticket.section.links": "关联",
  "ticket.section.subtasks": "子任务",

  "ticket.descWrite": "编辑",
  "ticket.descPreview": "预览",
  "ticket.descPlaceholder": "描述任务（支持 Markdown）…",
  "ticket.descEmpty": "添加描述…",

  "ticket.unanswered": "未回答：{count}",
  "ticket.answerPlaceholder": "你的回答…",
  "ticket.addQuestionPlaceholder": "添加问题…",

  "ticket.removeTag": "移除标签 {name}",
  "ticket.addTagPlaceholder": "添加标签：按 Enter 或输入逗号…",

  "ticket.status": "状态",
  "ticket.priority": "优先级",
  "ticket.dueDate": "截止日期",
  "ticket.team": "团队",
  "ticket.project": "项目",
  "ticket.saveChanges": "保存更改",

  "ticket.fieldNamePlaceholder": "字段名（例如 class）",
  "ticket.fieldValuePlaceholder": "值",

  "ticket.blocking": "阻塞",
  "ticket.blockerDone": "已完成",
  "ticket.noBlockers": "此工单未被任何工单阻塞",
  "ticket.blockerPlaceholder": "被哪个工单阻塞（例如 UE-80）",

  "ticket.noLinks": "没有关联",
  "ticket.linkRelates": "关联",
  "ticket.linkDuplicates": "是重复项",
  "ticket.linkPlaceholder": "工单编号（例如 UE-80）",

  "ticket.addSubtaskPlaceholder": "添加子任务…",

  "ticket.create.title": "新建工单",
  "ticket.create.project": "项目",
  "ticket.create.selectProject": "选择项目…",
  "ticket.create.titleLabel": "标题",
  "ticket.create.titlePlaceholder": "需要做什么？",
  "ticket.create.description": "描述",
  "ticket.create.descriptionPlaceholder": "添加详细信息…",
  "ticket.create.priority": "优先级",
  "ticket.create.dueDate": "截止日期",
  "ticket.create.team": "团队",
  "ticket.create.tags": "标签",
  "ticket.create.tagsPlaceholder": "例如：第一波工作, 计划中的第 4 阶段 123",
  "ticket.create.submit": "创建工单",
};

export default zh;
