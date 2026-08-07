// 内存数据层：以前端样例店铺为种子，维护发布/草稿版本隔离、审核队列、
// 反馈、审计日志与匿名提问计数。仅路由层（index.js）可读写；agent 模块
// 一律通过参数注入获得数据快照，不得 import 本文件。

import { SAMPLE_SHOPS } from "../src/data.js";

const clone = (value) => structuredClone(value);

export const db = {
  // draft 字段保存审核期间的菜单草稿；dishes 始终是线上已发布版本（契约：版本隔离）
  shops: SAMPLE_SHOPS.map((shop) => ({ ...clone(shop), publication_status: "published", review_status: "", rejection_reason: "", draft: null })),
  reviews: [],
  feedback: [],
  audit: [],
  questions: {},          // shopId -> 提问计数
  intents: {},            // shopId -> { intent: count }（匿名聚合，供洞察）
  tokens: { merchant: new Set(), admin: new Set() },
};

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function now() {
  return new Date().toISOString();
}

export function log(actor, action, target) {
  db.audit.unshift({ id: uid("log"), created_at: now(), actor, action, target });
}

export function findShop(id) {
  return db.shops.find((shop) => shop.id === id) || null;
}

// 游客可见视图：剔除内部字段
export function publicView(shop) {
  const { draft, review_status, rejection_reason, ...pub } = shop;
  return pub;
}

// 商户视图：菜单显示草稿优先（存在草稿说明正在编辑/审核）
export function merchantView(shop) {
  const { draft, ...rest } = shop;
  return { ...rest, dishes: draft?.items || shop.dishes };
}

export function countQuestion(shopId, intent) {
  db.questions[shopId] = (db.questions[shopId] || 0) + 1;
  const bucket = (db.intents[shopId] = db.intents[shopId] || {});
  bucket[intent] = (bucket[intent] || 0) + 1;
}

