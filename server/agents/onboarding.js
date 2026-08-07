// 建檔 Agent（shop-onboarding）
// 把商戶提供的「店鋪介紹 + 菜單文字」整理爲結構化店鋪草稿。
// 紅線：只整理商戶提供的內容，不虛構價格/成分/過敏原；
// 解析不了的行進入 warnings，菜品一律 confirmed=false 待人工確認。
//
// Live 模式：走 QwenPaw 智能體（提示詞見 prompts/onboarding.md，LLM 對「奇怪的
// 一行」的理解力優於正則）；validate() 強制草稿狀態、allergens 留空、confirmed=false、
// 無可信價格的條目剔除。mock 路徑同步返回（agents.test.mjs 依賴），live 返回 Promise。

import { parseAgentJson } from "../lib/llm.js";

const CATEGORY_HINTS = [
  ["drink", /茶|咖啡|奶|汁|水|飲|飲|凍|凍|啤/],
  ["dessert", /撻|撻|糕|布甸|布丁|甜|露|冰淇淋|雪糕/],
  ["gift", /餅家?$|餅|蛋卷|蛋捲|糖|禮|禮|手信/],
  ["snack", /包$|多士|治$|小食|串|餃|餃|腸粉|腸粉/],
];

const CATEGORIES = new Set(["main", "snack", "drink", "dessert", "gift"]);

function guessCategory(name) {
  return CATEGORY_HINTS.find(([, rx]) => rx.test(name))?.[0] || "main";
}

export function runLocal({ description = "", menuText = "", locale = "zh" }) {
  const warnings = [];
  const items = [];
  menuText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line, index) => {
    const match = line.match(/^(.+?)[\s·：:]+(?:MOP\s*)?(\d+(?:\.\d+)?)\s*(?:MOP|元|蚊)?$/i);
    if (!match) { warnings.push(`第 ${index + 1} 行「${line}」無法解析出「菜名 價格」，已略過。`); return; }
    const zh = match[1].trim();
    items.push({
      id: `dish-${Date.now().toString(36)}-${index}`,
      category: guessCategory(zh),
      price: Number(match[2]),
      name: { zh },
      desc: { zh: "" },
      allergens: {},
      confirmed: false,
    });
  });

  const nameZh = description.split(/[，,。.\n]/)[0].trim().slice(0, 16) || "未命名店舖";
  if (!items.length) warnings.push("菜單文字未解析出任何菜品，請檢查格式（每行：菜名 價格）。");

  return {
    shop: {
      id: `shop-${Date.now().toString(36)}`,
      name: { zh: nameZh },
      type: { zh: "街坊小店" },
      district: { zh: "澳門" },
      story: { zh: description },
      payments: [],
      publication_status: "draft",
      dishes: items,
    },
    warnings,
  };
}

// —— live 路徑三段件：buildPrompt → llm.invoke → validate ——

export function buildPrompt({ description = "", menuText = "", locale = "zh" }) {
  // 用戶消息格式與 prompts/onboarding.md 一致（對外字段名爲 menu_text）
  return { user: JSON.stringify({ locale, description, menu_text: menuText }) };
}

const zhOf = (value, fallback = "") => {
  const text = typeof value === "string" ? value : value?.zh;
  return typeof text === "string" && text.trim() ? text.trim() : fallback;
};

export function validate(raw, { description = "" } = {}) {
  if (!raw || typeof raw !== "object" || !raw.shop || typeof raw.shop !== "object") throw new Error("BAD_SHOP");
  const src = raw.shop;
  const warnings = (Array.isArray(raw.warnings) ? raw.warnings : []).filter((entry) => typeof entry === "string");
  const stamp = Date.now().toString(36);

  const dishes = (Array.isArray(src.dishes) ? src.dishes : [])
    .map((dish, index) => {
      const zh = zhOf(dish?.name);
      const price = Number(dish?.price);
      // 紅線：沒有可信「菜名 + 價格」的條目一律不進草稿（禁止編造價格）
      if (!zh || !Number.isFinite(price) || price < 0) {
        warnings.push(`「${zh || "未知菜品"}」缺少可信價格，已略過，請人工補充。`);
        return null;
      }
      return {
        id: `dish-${stamp}-${index}`, // 紅線：id 一律由代碼層生成
        category: CATEGORIES.has(dish.category) ? dish.category : guessCategory(zh),
        price,
        name: { zh },
        desc: { zh: zhOf(dish?.desc) },
        allergens: {}, // 紅線：建檔階段不猜成分，過敏原一律留空待店主確認
        confirmed: false, // 紅線：全部待人工確認
      };
    })
    .filter(Boolean);
  if (!dishes.length) warnings.push("菜單文字未解析出任何菜品，請檢查格式（每行：菜名 價格）。");

  return {
    shop: {
      id: `shop-${stamp}`,
      name: { zh: zhOf(src.name).slice(0, 16) || "未命名店舖" },
      type: { zh: zhOf(src.type, "街坊小店") },
      district: { zh: zhOf(src.district, "澳門") },
      story: { zh: zhOf(src.story, description) },
      payments: (Array.isArray(src.payments) ? src.payments : [])
        .filter((entry) => typeof entry === "string" && entry.trim())
        .map((entry) => entry.trim()),
      publication_status: "draft", // 紅線：建檔產物只能是草稿
      dishes,
    },
    warnings,
  };
}

export function run(input, { llm } = {}) {
  if (!llm?.enabled) return runLocal(input);
  return runLive(input, llm);
}

async function runLive(input, llm) {
  try {
    const raw = await llm.invoke("onboarding", buildPrompt(input));
    return validate(parseAgentJson(raw), input);
  } catch {
    return { ...runLocal(input), degraded: true };
  }
}

