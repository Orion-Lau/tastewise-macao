// FAQ 生成 Agent（faq-generator）
// 只根据店铺档案（注入的 shop 快照）生成常见问答草稿；
// 忌口相关答案强制 requires_confirmation=true。不虚构档案里没有的事实。
//
// Live 模式：走 QwenPaw 智能体（提示词见 prompts/faq-generator.md）；validate()
// 生成 id、规整语种结构、忌口类问答强制二次确认。mock 路径同步返回
// （agents.test.mjs 依赖），live 路径返回 Promise。

import { parseAgentJson } from "../lib/llm.js";

const localize = (value, lang = "zh") => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.zh || Object.values(value)[0] || "";
};

// 命中即强制二次确认的忌口/过敏关键词（问题与答案一起检测）
const CONFIRM_RX = /豬|猪|pork|porco|素食|vegan|vegetarian|清真|halal|過敏|过敏|allerg|坚果|堅果|ナッツ|海鮮|海鲜|seafood|忌口|蛋奶|麩質|麸质|gluten/i;
const EMPTY_WARNING = "店鋪檔案資料不足，未能生成 FAQ，請先完善店鋪資料。";

export function runLocal({ shop, locale = "zh" }) {
  const faqs = [];
  const dishes = shop?.dishes || [];
  const featured = dishes.find((dish) => dish.featured) || dishes[0];
  const stamp = Date.now().toString(36);

  if (featured) {
    const list = dishes.filter((dish) => dish.featured).concat(featured).slice(0, 3);
    const names = [...new Set(list.map((dish) => localize(dish.name)))].join("、");
    faqs.push({
      id: `faq-${stamp}-1`,
      question: { zh: "有甚麼招牌推介？", en: "What are your signatures?" },
      answer: { zh: `${names} 最受歡迎。`, en: `Popular picks: ${names}.` },
      requires_confirmation: false,
    });
  }
  if (shop?.payments?.length) {
    faqs.push({
      id: `faq-${stamp}-2`,
      question: { zh: "接受哪些支付方式？", en: "Which payments do you accept?" },
      answer: { zh: `本店接受${shop.payments.join("、")}。`, en: `We accept ${shop.payments.join(", ")}.` },
      requires_confirmation: false,
    });
  }
  if (shop?.hours) {
    faqs.push({
      id: `faq-${stamp}-3`,
      question: { zh: "營業時間是？", en: "What are your opening hours?" },
      answer: { zh: `${shop.hours}。節假日以店門公告為準。`, en: `${shop.hours}. May change on holidays.` },
      requires_confirmation: false,
    });
  }
  const noPork = dishes.filter((dish) => !dish.allergens?.pork && !(dish.tags || []).includes("含豬肉"));
  if (noPork.length) {
    faqs.push({
      id: `faq-${stamp}-4`,
      question: { zh: "有不含豬肉的選擇嗎？", en: "Any pork-free options?" },
      answer: {
        zh: `${noPork.slice(0, 3).map((dish) => localize(dish.name)).join("、")}等不含豬肉；嚴格忌口請落單前向店員確認。`,
        en: `${noPork.slice(0, 3).map((dish) => localize(dish.name, "en")).join(", ")} contain no pork; please confirm strict needs with staff.`,
      },
      requires_confirmation: true,
    });
  }
  return { faqs, warnings: faqs.length ? [] : [EMPTY_WARNING] };
}

// —— live 路径三段件：buildPrompt → llm.invoke → validate ——

export function buildPrompt({ shop, locale = "zh" }) {
  // 用户消息格式与 prompts/faq-generator.md 一致
  const dishes = (shop?.dishes || []).map((dish) => ({
    id: dish.id,
    featured: dish.featured || undefined,
    price: dish.price,
    name: dish.name,
    tags: dish.tags || [],
    allergens: dish.allergens || {},
  }));
  return {
    user: JSON.stringify({
      locale,
      shop: { name: shop?.name, hours: shop?.hours, payments: shop?.payments || [], dishes },
    }),
  };
}

const normText = (value) => {
  if (typeof value === "string" && value.trim()) return { zh: value.trim() };
  if (value && typeof value === "object") return value;
  return null;
};

export function validate(raw) {
  if (!raw || !Array.isArray(raw.faqs)) throw new Error("BAD_FAQS");
  const stamp = Date.now().toString(36);
  const faqs = raw.faqs
    .map((entry, index) => {
      const question = normText(entry?.question);
      const answer = normText(entry?.answer);
      if (!question?.zh?.trim() || !answer?.zh?.trim()) return null;
      if (!question.en) question.en = question.zh;
      if (!answer.en) answer.en = answer.zh;
      const text = `${Object.values(question).join(" ")} ${Object.values(answer).join(" ")}`;
      return {
        id: `faq-${stamp}-${index + 1}`, // 红线：id 一律由代码层生成
        question,
        answer,
        // 红线：忌口/过敏相关问答强制二次确认
        requires_confirmation: CONFIRM_RX.test(text) ? true : Boolean(entry.requires_confirmation),
      };
    })
    .filter(Boolean)
    .slice(0, 6);
  const warnings = (Array.isArray(raw.warnings) ? raw.warnings : []).filter((entry) => typeof entry === "string");
  if (!faqs.length && !warnings.length) warnings.push(EMPTY_WARNING);
  return { faqs, warnings };
}

export function run(input, { llm } = {}) {
  if (!llm?.enabled) return runLocal(input);
  return runLive(input, llm);
}

async function runLive(input, llm) {
  try {
    const raw = await llm.invoke("faq-generator", buildPrompt(input));
    return validate(parseAgentJson(raw));
  } catch {
    return { ...runLocal(input), degraded: true };
  }
}

