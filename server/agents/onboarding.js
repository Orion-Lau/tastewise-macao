// 建档 Agent（shop-onboarding）
// 把商户提供的「店铺介绍 + 菜单文字」整理为结构化店铺草稿。
// 红线：只整理商户提供的内容，不虚构价格/成分/过敏原；
// 解析不了的行进入 warnings，菜品一律 confirmed=false 待人工确认。
//
// Live 模式：走 QwenPaw 智能体（提示词见 prompts/onboarding.md，LLM 对「奇怪的
// 一行」的理解力优于正则）；validate() 强制草稿状态、allergens 留空、confirmed=false、
// 无可信价格的条目剔除。mock 路径同步返回（agents.test.mjs 依赖），live 返回 Promise。

import { parseAgentJson } from "../lib/llm.js";

const CATEGORY_HINTS = [
  ["drink", /茶|咖啡|奶|汁|水|飲|饮|凍|冻|啤/],
  ["dessert", /撻|挞|糕|布甸|布丁|甜|露|冰淇淋|雪糕/],
  ["gift", /餅家?$|饼|蛋卷|蛋捲|糖|禮|礼|手信/],
  ["snack", /包$|多士|治$|小食|串|餃|饺|腸粉|肠粉/],
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

// —— live 路径三段件：buildPrompt → llm.invoke → validate ——

export function buildPrompt({ description = "", menuText = "", locale = "zh" }) {
  // 用户消息格式与 prompts/onboarding.md 一致（对外字段名为 menu_text）
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
      // 红线：没有可信「菜名 + 价格」的条目一律不进草稿（禁止编造价格）
      if (!zh || !Number.isFinite(price) || price < 0) {
        warnings.push(`「${zh || "未知菜品"}」缺少可信價格，已略過，請人工補充。`);
        return null;
      }
      return {
        id: `dish-${stamp}-${index}`, // 红线：id 一律由代码层生成
        category: CATEGORIES.has(dish.category) ? dish.category : guessCategory(zh),
        price,
        name: { zh },
        desc: { zh: zhOf(dish?.desc) },
        allergens: {}, // 红线：建档阶段不猜成分，过敏原一律留空待店主确认
        confirmed: false, // 红线：全部待人工确认
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
      publication_status: "draft", // 红线：建档产物只能是草稿
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
