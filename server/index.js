// 澳味智譯參考後端：實現 API_CONTRACT.md 全部端點，零第三方依賴。
//   node server/index.js          （默認 8788 端口）
// Agent 編排規則見 AGENTS.md：本文件是唯一的編排層——從 store 取數據快照
// 注入 agent 純函數，再把結果寫回 store；agent 之間沒有任何直接調用。
// 演示口令：商戶/管理員登錄接受任意賬號 + 非空密碼（正式環境必須換真實鑑權）。

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

// QwenPaw 客戶端：無密鑰時 enabled=false，各 agent 自動走本地 mock（詳見 AGENTS.md）
const llm = createLlm(loadConfig());

// 翻譯詞典：由已發佈店鋪的多語數據構建，注入 translator（正式環境換成 LLM）
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

// 提交審覈：草稿進隊列，線上菜單保持不動（版本隔離）
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
      shop.rejection_reason = reason || "請根據平臺意見修改後重新提交。";
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

    // ── 認證 ─────────────────────────────────────────
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

    // ── 遊客公開接口 ─────────────────────────────────
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
      const result = await assistant.run({ shop: publicView(shop), query: payload.query, locale: payload.locale, messageId: uid("ans") }, { llm });
      countQuestion(shop.id, result.intent);
      return json(res, 200, result);
    }
    if (req.method === "POST" && seg[1] === "shops" && seg[3] === "feedback") {
      const shop = findShop(seg[2]);
      db.feedback.unshift({ id: uid("fb"), shop_name: shop?.name?.zh || seg[2], helpful: Boolean(payload.helpful), category: payload.category || "assistant_answer", created_at: now() });
      return json(res, 200, { status: "recorded" });
    }

    // ── 商戶接口（需商戶令牌）──────────────────────────
    if (seg[1] === "merchant") {
      if (!auth.merchant(req)) return json(res, 401, { message: "商戶登入已過期，請重新登入" });

      if (req.method === "GET" && path === "/v1/merchant/dashboard") {
        const questions = Object.values(db.questions).reduce((sum, n) => sum + n, 0);
        const activities = db.audit.slice(0, 5).map((entry) => ({ id: entry.id, type: entry.action.includes("approve") ? "publish" : entry.action.includes("submit") ? "safety" : "translation", title: `${entry.action} · ${entry.target}`, created_at: entry.created_at }));
        return json(res, 200, { questions_this_week: questions, activities });
      }
      if (req.method === "GET" && path === "/v1/merchant/shops") {
        return json(res, 200, { shops: db.shops.map(merchantView) });
      }
      if (req.method === "POST" && path === "/v1/merchant/shops") {
        const result = await onboarding.run({ description: payload.description, menuText: payload.menu_text, locale: payload.locale }, { llm });
        const shop = { ...result.shop, review_status: "", rejection_reason: "", draft: null, everPublished: false };
        db.shops.push(shop);
        log("merchant@demo.mo", "create_shop", shop.name.zh);
        return json(res, 200, { shop: merchantView(shop), warnings: result.warnings });
      }
      if (req.method === "POST" && path === "/v1/merchant/menu-import") {
        const { fields, filename, size } = parseMultipart(body);
        const result = extractor.run({ shopName: fields.shop_name, filename, size });
        return json(res, 200, result);
      }
      if (seg[2] === "shops" && seg[3]) {
        const shop = findShop(seg[3]);
        if (!shop) return json(res, 404, { message: "店舖不存在" });
        const tail = seg[4] || "";

        if (req.method === "PUT" && !tail) {
          ["address", "phone", "hours", "payments", "story"].forEach((key) => { if (payload[key] !== undefined) shop[key] = key === "story" ? { ...shop.story, zh: payload.story } : payload[key]; });
          if (payload.name?.zh) shop.name = { ...shop.name, ...payload.name };
          log("merchant@demo.mo", "update_profile", shop.name?.zh || shop.id);
          return json(res, 200, { shop: merchantView(shop) });
        }
        if (req.method === "POST" && tail === "media") {
          const { filename } = parseMultipart(body);
          return json(res, 200, { url: `http://localhost:${PORT}/media/${encodeURIComponent(filename || "cover.jpg")}` });
        }
        if (req.method === "PUT" && tail === "menu-draft") {
          shop.draft = { items: structuredClone(payload.items || []) };
          return json(res, 200, { status: "saved", item_count: shop.draft.items.length });
        }
        if (req.method === "POST" && tail === "translate") {
          const result = await translator.run({ items: payload.items || [], locales: payload.locales, lexicon: buildLexicon() }, { llm });
          return json(res, 200, result);
        }
        if (req.method === "GET" && tail === "faqs") return json(res, 200, { faqs: shop.faqs || [] });
        if (req.method === "PUT" && tail === "faqs") { shop.faqs = payload.faqs || []; return json(res, 200, { faqs: shop.faqs }); }
        if (req.method === "POST" && tail === "faqs" && seg[5] === "generate") {
          return json(res, 200, await faqGenerator.run({ shop: publicView(shop), locale: payload.locale }, { llm }));
        }
        if (req.method === "POST" && tail === "marketing-copy") {
          return json(res, 200, await marketing.run({ shop: publicView(shop), platform: payload.platform, brief: payload.brief, locale: payload.locale }, { llm }));
        }
        if (req.method === "GET" && tail === "insights") {
          const intents = db.intents[shop.id] || {};
          const labels = { recommendation: "招牌推介", payment: "支付方式", dietary: "忌口需求", budget: "預算", hours: "營業時間", forbidden: "超範圍提問" };
          const helpful = db.feedback.filter((f) => f.helpful).length;
          return json(res, 200, {
            total_questions: db.questions[shop.id] || 0,
            staff_confirmation_rate: 18,
            helpful_rate: db.feedback.length ? Math.round((helpful / db.feedback.length) * 100) : 90,
            unanswered: intents.forbidden || 0,
            categories: Object.entries(intents).map(([key, count]) => ({ key, label: labels[key] || key, count })),
          });
        }
        if (req.method === "POST" && tail === "menu-submit") {
          return json(res, 200, submitMenu(shop, payload.items || []));
        }
      }
    }

    // ── 管理員接口（需管理員令牌）──────────────────────
    if (seg[1] === "admin") {
      if (!auth.admin(req)) return json(res, 401, { message: "管理員登入已過期，請重新登入" });

      if (req.method === "GET" && path === "/v1/admin/reviews") {
        return json(res, 200, {
          reviews: db.reviews.map((review) => ({
            id: review.id, type: review.type, shop_name: review.shop_name, submitted_at: review.submitted_at,
            items: review.items.map((item) => ({
              id: item.id,
              name: item.name?.zh || item.name,
              description: item.desc?.zh || item.description || "",
              price: item.price,
              allergens: item.allergens || {},
              risk_flags: review.risk.results.find((row) => row.id === item.id)?.flags || [],
            })),
          })),
        });
      }
      if (req.method === "POST" && seg[2] === "reviews" && seg[4] === "decision") {
        const review = db.reviews.find((item) => item.id === seg[3]);
        if (!review) return json(res, 404, { message: "審核項目不存在" });
        if (payload.decision === "reject" && !payload.reason?.trim()) return json(res, 400, { message: "退回必須填寫原因" });
        return json(res, 200, decideReview(review, payload.decision, payload.reason));
      }
      if (req.method === "GET" && path === "/v1/admin/feedback") return json(res, 200, { feedback: db.feedback });
      if (req.method === "GET" && path === "/v1/admin/audit-log") return json(res, 200, { logs: db.audit });
    }

    return json(res, 404, { message: `未知端點 ${req.method} ${path}` });
  } catch (error) {
    return json(res, error.message === "BODY_TOO_LARGE" ? 413 : 500, { message: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`澳味智譯參考後端已啓動: http://localhost:${PORT}`);
  console.log("Agent 模塊: assistant / menu-extractor / onboarding / translator / faq-generator / marketing / risk-checker");
  console.log(llm.enabled ? "模式: QwenPaw live（平臺失敗自動降級 mock）" : "模式: 本地 mock（未配置 QWENPAW_API_BASE / QWENPAW_API_KEY）");
});

