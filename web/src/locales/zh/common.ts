import type ru from "../ru/common";

const zh: Record<keyof typeof ru, string> = {
  "status.triage": "待定夺",
  "status.backlog": "待办池",
  "status.todo": "待开始",
  "status.in_progress": "进行中",
  "status.ready_for_review": "待审核",
  "status.done": "已完成",
  "status.cancelled": "已取消",

  "priority.urgent": "紧急",
  "priority.high": "高",
  "priority.medium": "中",
  "priority.low": "低",

  "link.duplicateOf": "重复项",
  "link.duplicatedBy": "存在重复项",
  "link.relatesTo": "关联",

  "common.save": "保存",
  "common.cancel": "取消",
  "common.close": "关闭",
  "common.delete": "删除",
  "common.edit": "编辑",
  "common.create": "创建",
  "common.add": "添加",
  "common.loading": "加载中…",
  "common.none": "无",
};

export default zh;
