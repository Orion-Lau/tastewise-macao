// 內存數據層：以前端樣例店鋪爲種子，維護髮布/草稿版本隔離、審覈隊列、
// 反饋、審計日誌與匿名提問計數。僅路由層（index.js）可讀寫；agent 模塊
// 一律通過參數注入獲得數據快照，不得 import 本文件。

import { SAMPLE_SHOPS } from "../src/data.js";

const clone = (value) => structuredClone(value);

export const db = {
  // draft 字段保存審覈期間的菜單草稿；dishes 始終是線上已發佈版本（契約：版本隔離）
  shops: SAMPLE_SHOPS.map((shop) => ({ ...clone(shop), publication_status: "published", review_status: "", rejection_reason: "", draft: null })),
  reviews: [],
  feedback: [],
  audit: [],
  questions: {},          // shopId -> 提問計數
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

// 遊客可見視圖：剔除內部字段
export function publicView(shop) {
  const { draft, review_status, rejection_reason, ...pub } = shop;
  return pub;
}

// 商戶視圖：菜單顯示草稿優先（存在草稿說明正在編輯/審覈）
export function merchantView(shop) {
  const { draft, ...rest } = shop;
  return { ...rest, dishes: draft?.items || shop.dishes };
}

export function countQuestion(shopId, intent) {
  db.questions[shopId] = (db.questions[shopId] || 0) + 1;
  const bucket = (db.intents[shopId] = db.intents[shopId] || {});
  bucket[intent] = (bucket[intent] || 0) + 1;
}

