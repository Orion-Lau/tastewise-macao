// 澳味智译参考后端：实现 API_CONTRACT.md 全部端点，零第三方依赖。
//   node server/index.js          （默认 8788 端口）
// Agent 编排规则见 AGENTS.md：本文件是唯一的编排层——从 store 取数据快照
// 注入 agent 纯函数，再把结果写回 store；agent 之间没有任何直接调用。
// 演示口令：商户/管理员登录接受任意账号 + 非空密码（正式环境必须换真实鉴权）。

import http from "node:http";
import { json, preflight, readBody, parseJson, parseMultipart, bearer } from "./lib/http.js";
import { db, uid, now, log, findShop, publicView, merchantView, countQuestion } from "./store.js";
import { loadConfig } from "./config.js";
import { createLlm } from "./lib/llm.js";
import * as assistant from "./agents/assistant.js";
import * as extractor from "./agents/menu-extractor.js";
import * as onboarding from "./agents/onboarding.js";
import * as translator from "./agents/translator.js";
import * as faqGenerator from "./agents/faq-generator.js";
import * as marketing from "./agents/marketing.js";
import * as riskChecker from "./agents/risk-checker.js";

const PORT = Number(process.env.PORT || 8788);

// QwenPaw 客户端：无密钥时 enabled=false，各 agent 自动走本地 mock（详见 AGENTS.md）
const llm = createLlm(loadConfig());

// 翻译词典：由已发布店铺的多语数据构建，注入 translator（正式环境换成 LLM）
function buildLexicon() {
  const lexicon = {};
  db.shops.forEach((shop) => (shop.dishes || []).forEach((dish) => {
    [dish.name, dish.desc].forEach((field) => {
      if (field?.zh) lexicon[field.zh] = { en: field.en, pt: field.pt, ja: field.ja };
    });
  }));
  return lexicon;
}

const auth = {
  merchant(req) { return db.tokens.merchant.has(bearer(req)); },
  admin(req) { return db.tokens.admin.has(bearer(req)); },
};

function login(scope, payload) {
  if (!payload.identifier || !payload.password) return null;
  const token = uid(`${scope}-token`);
  db.tokens[scope].add(token);
  return { access_token: token, expires_in: 3600 };
}

// 提交审核：草稿进队列，线上菜单保持不动（版本隔离）
function submitMenu(shop, items) {
  const check = riskChecker.run({ items });
  const review = {
    id: uid("review"),
    type: shop.everPublished === false || shop.publication_status === "draft" || shop.publication_status === "rejected" ? "new_shop" : "menu_update",
    shop_id: shop.id,
    shop_name: shop.name?.zh || "",
    submitted_at: now(),
    items: structuredClone(items),
    risk: check,
  };
  db.reviews.push(review);
  shop.draft = { items: structuredClone(items) };
  shop.review_status = "pending";
  if (shop.publication_status !== "published") shop.publication_status = "pending";
  shop.rejection_reason = "";
  log("merchant@demo.mo", "submit_menu", review.shop_name);
  return { review_id: review.id, status: "pending", risk_flags: check.total_flags };
}

function decideReview(review, decision, reason) {
  const shop = findShop(review.shop_id);
  db.reviews = db.reviews.filter((item) => item.id !== review.id);
  if (shop) {
    if (decision === "approve") {
      shop.dishes = structuredClone(review.items);
      shop.publication_status = "published";
      shop.review_status = "";
      shop.rejection_reason = "";
      shop.draft = null;
    } else {
      shop.review_status = "rejected";
      if (shop.publication_status !== "published") shop.publication_status = "rejected";
      shop.rejection_reason = reason || "請根據平台意見修改後重新提交。";
    }
  }
  log("admin@tastewise.mo", decision === "approve" ? "approve_review" : "reject_review", review.shop_name);
  return { status: decision === "approve" ? "approved" : "rejected" };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return preflight(res);
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname.replace(/\/$/, "") || "/";
    const seg = path.split("/").filter(Boolean); // ["v1", ...]
    const body = ["POST", "PUT"].includes(req.method) ? await readBody(req) : Buffer.alloc(0);
    const isMultipart = (req.headers["content-type"] || "").includes("multipart/form-data");
    const payload = isMultipart ? null : parseJson(body);

    // ── 认证 ─────────────────────────────────────────
    if (req.method === "POST" && path === "/v1/auth/login") {
      const result = login("merchant", payload);
      return result ? json(res, 200, result) : json(res, 401, { message: "請輸入賬號和密碼（參考後端接受任意賬號＋非空密碼）" });
    }
    if (req.method === "POST" && path === "/v1/admin/auth/login") {
      const result = login("admin", payload);
      return result ? json(res, 200, result) : json(res, 401, { message: "請輸入管理員賬號和密碼" });
    }
    if (req.method === "POST" && path === "/v1/auth/password-reset/request") {
      return json(res, 200, { message: "如果賬號存在，重設密碼鏈接已經發送。" });
    }

    // ── 游客公开接口 ─────────────────────────────────
    if (req.method === "GET" && path === "/v1/shops") {
      return json(res, 200, { shops: db.shops.filter((shop) => shop.publication_status === "published").map(publicView) });
    }
    if (req.method === "GET" && seg[0] === "v1" && seg[1] === "shops" && seg.length === 3) {
      const shop = findShop(seg[2]);
      return shop ? json(res, 200, publicView(shop)) : json(res, 404, { message: "店舖不存在" });
    }
    if (req.method === "POST" && seg[1] === "shops" && seg[3] === "assistant") {
      const shop = findShop(seg[2]);
      if (!shop || shop.publication_status !== "published") return json(res, 404, { message: "店舖不存在或未發布" });
      const result = await assistant.run({ shop:…8623 tokens truncated…ategory: "snack", price: 32, name: { zh: "招牌豬扒包" }, desc: { zh: "豬扒即叫即炸" }, allergens: { pork: true }, confirmed: false },
  { id: "ext-2", category: "main", price: 48, name: { zh: "乾炒牛河" }, desc: { zh: "大火豉油乾炒" }, allergens: { beef: true }, confirmed: false },
  { id: "ext-3", category: "drink", price: 20, name: { zh: "絲襪奶茶" }, desc: { zh: "茶味厚、奶香順" }, allergens: { eggdairy: true }, confirmed: false },
  { id: "ext-4", category: "dessert", price: 0, name: { zh: "楊枝甘露" }, desc: { zh: "" }, allergens: {}, confirmed: false },
];

export function run({ shopName = "", filename = "", size = 0 }) {
  const warnings = [
    "參考實現未接 OCR，以下為示範草稿；正式環境將解析上傳原檔。",
    "第 4 項「楊枝甘露」價格無法確認，已置 0，請人工校對。",
  ];
  if (!filename) warnings.push("未取得檔案名稱。");
  return {
    import_id: `import-${Date.now().toString(36)}`,
    shop_name: shopName,
    source_file: { filename, size },
    items: TEMPLATE_ITEMS.map((item) => ({ ...item, name: { ...item.name }, desc: { ...item.desc }, allergens: { ...item.allergens } })),
    warnings,
  };
}
