// 接待问答 Agent（reception-assistant）
// 只依据调用方注入的已发布店铺快照回答；资料缺失时明确说不确定，
// 过敏原/忌口类回答一律要求向店员二次确认；医疗/海关/法律问题拒绝推测。
//
// Live 模式（QWENPAW_PLAN.md §3）：run(input, { llm }) 在 llm.enabled 时走
// QwenPaw 平台（提示词见 prompts/assistant.md），validate() 做红线后校验；
// 平台失败或输出违规自动降级 runLocal 并带 degraded: true。
// 注意：mock 路径保持同步返回（agents.test.mjs 依赖此行为），live 路径返回
// Promise——调用方统一 await 即可兼容两态。

import { parseAgentJson } from "../lib/llm.js";

const localize = (value, lang) => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.en || value.zh || Object.values(value)[0] || "";
};

const FORBIDDEN_RX = /医生|醫生|药|藥|过敏史|過敏史|诊断|診斷|海关|海關|报关|報關|签证|簽證|法律|违法|違法/;
const DIETARY_RX = /pork|porco|豬|猪|豚|素食|vegan|vegetarian|ベジ|清真|halal|忌口|过敏|過敏|allerg|坚果|堅果|ナッツ|海鲜|海鮮|marisco|seafood/i;

const INTENTS = [
  ["forbidden", FORBIDDEN_RX],
  ["dietary", DIETARY_RX],
  ["payment", /pay|alipay|支付|付款|付き|支払|pagamento|现金|現金|澳门通|澳門通|信用卡/i],
  ["budget", /50|便宜|预算|預算|以内|以內|barato|menos|até|安い/i],
  ["hours", /几点|幾點|营业|營業|开门|開門|关门|關門|hora|open|close|時間/i],
  ["recommendation", /.*/],
];

const TEXT = {
  zh: {
    forbidden: "抱歉，醫療、海關及法律問題超出小店可回答的範圍，請諮詢官方渠道。以下只提供店內菜單資訊。",
    dietary: (names) => `依店主已確認資料，可考慮：${names}。如屬嚴格忌口或過敏，落單前請務必再向店員確認。`,
    dietaryEmpty: "店主尚未確認相關成分資料，無法替你判斷，請直接向店員確認。",
    payment: (list) => `本店接受：${list}。實際以收銀台最新告示為準。`,
    budget: (names) => `50 MOP 以內可選：${names}。`,
    hours: (hours) => `營業時間：${hours}。節假日可能調整，以店門公告為準。`,
    recommendation: (name, price, desc) => `店主推介「${name}」，MOP ${price}。${desc}`,
  },
  en: {
    forbidden: "Sorry — medical, customs and legal questions are outside what the shop can answer. Please consult official channels.",
    dietary: (names) => `Based on owner-confirmed records you could consider: ${names}. For strict diets or allergies, please confirm with staff before ordering.`,
    dietaryEmpty: "The owner has not confirmed the relevant ingredient records, so I can't judge this. Please ask the staff directly.",
    payment: (list) => `The shop accepts: ${list}. Follow the latest notice at the counter.`,
    budget: (names) => `Under MOP 50 you could pick: ${names}.`,
    hours: (hours) => `Opening hours: ${hours}. May change on holidays.`,
    recommendation: (name, price, desc) => `The owner's pick is "${name}" at MOP ${price}. ${desc}`,
  },
  pt: {
    forbidden: "Desculpe — questões médicas, aduaneiras e legais estão fora do âmbito da loja. Consulte os canais oficiais.",
    dietary: (names) => `Com base nos dados confirmados pelo dono: ${names}. Para restrições rigorosas, confirme com o pessoal.`,
    dietaryEmpty: "O dono ainda não confirmou os ingredientes relevantes. Pergunte diretamente ao pessoal.",
    payment: (list) => `A loja aceita: ${list}. Confirme no balcão.`,
    budget: (names) => `Até 50 MOP pode escolher: ${names}.`,
    hours: (hours) => `Horário: ${hours}.`,
    recommendation: (name, price, desc) => `A sugestão da casa é "${name}", MOP ${price}. ${desc}`,
  },
  ja: {
    forbidden: "申し訳ありませんが、医療・税関・法律に関する質問はお店では回答できません。公式窓口にご確認ください。",
    dietary: (names) => `店主確認済みの情報では ${names} が候補です。厳格な制限やアレルギーは、注文前に必ずスタッフへご確認ください。`,
    dietaryEmpty: "該当する成分情報を店主がまだ確認していないため、判断できません。スタッフに直接ご確認ください。",
    payment: (list) => `支払い方法：${list}。店頭の最新案内をご確認ください。`,
    budget: (names) => `50 MOP 以内なら ${names} があります。`,
    hours: (hours) => `営業時間：${hours}。`,
    recommendation: (name, price, desc) => `店主のおすすめは「${name}」（MOP ${price}）です。${desc}`,
  },
};

// 忌口候选过滤：runLocal 与 validate 共用同一套排除逻辑（红线只实现一次）
function dietaryCandidates(query, dishes) {
  const wantsPork = /pork|porco|豬|猪|豚/i.test(query);
  const wantsVeg = /素食|vegan|vegetarian|ベジ/i.test(query);
  const noNuts = /坚果|堅果|花生|杏仁|nuts?\b|ナッツ|amendoim/i.test(query);
  const noSeafood = /海鲜|海鮮|seafood|marisco|魚介|蝦|虾|蟹/i.test(query);
  return dishes.filter((dish) => {
    const text = `${(dish.tags || []).join(" ")} ${(dish.ingredients || []).join(" ")}`;
    if (wantsPork && (dish.allergens?.pork || /含豬肉|豬/.test(text))) return false;
    if (wantsVeg && !/素食|純素/.test(text)) return false;
    if (noNuts && (dish.allergens?.nuts || dish.allergens?.nut || /堅果|花生|杏仁/.test(text))) return false;
    if (noSeafood && (dish.allergens?.seafood || /海鮮|蝦|蟹|魚/.test(text))) return false;
    return true;
  });
}

export function runLocal({ shop, query = "", locale = "zh", messageId = `ans-${Date.now()}` }) {
  const t = TEXT[locale] || TEXT.zh;
  const dishes = shop?.dishes || [];
  const intent = INTENTS.find(([, rx]) => rx.test(query))?.[0] || "recommendation";
  const names = (items) => items.slice(0, 3).map((dish) => `${localize(dish.name, locale)} (MOP ${dish.price})`).join("、");
  const base = { message_id: messageId, source: "owner_confirmed", intent, risk: "low", requires_confirmation: false, related_dish_ids: [] };

  if (intent === "forbidden") {
    return { ...base, risk: "high", requires_confirmation: true, answer: t.forbidden };
  }
  if (intent === "dietary") {
    const candidates = dietaryCandidates(query, dishes);
    return {
      ...base,
      requires_confirmation: true,
      related_dish_ids: candidates.slice(0, 3).map((dish) => dish.id),
      answer: candidates.length ? t.dietary(names(candidates)) : t.dietaryEmpty,
    };
  }
  if (intent === "payment") {
    const list = (shop?.payments || []).join("、");
    return list ? { ...base, answer: t.payment(list) } : { ...base, requires_confirmation: true, answer: t.dietaryEmpty };
  }
  if (intent === "budget") {
    const cheap = dishes.filter((dish) => Number(dish.price) <= 50);
    return { ...base, related_dish_ids: cheap.slice(0, 3).map((dish) => dish.id), answer: t.budget(names(cheap)) };
  }
  if (intent === "hours") {
    return shop?.hours ? { ...base, answer: t.hours(shop.hours) } : { ...base, requires_confirmation: true, answer: t.dietaryEmpty };
  }
  const featured = dishes.find((dish) => dish.featured) || dishes[0];
  if (!featured) return { ...base, requires_confirmation: true, answer: t.dietaryEmpty };
  return {
    ...base,
    related_dish_ids: [featured.id],
    answer: t.recommendation(localize(featured.name, locale), featured.price, localize(featured.desc, locale)),
  };
}

// —— live 路径三段件：buildPrompt → llm.invoke → validate ——

export function buildPrompt({ shop, query = "", locale = "zh" }) {
  // 用户消息格式与 prompts/assistant.md 一致；系统提示词配置在平台侧
  const dishes = (shop?.dishes || []).map((dish) => ({
    id: dish.id,
    price: dish.price,
    featured: dish.featured || undefined,
    name: dish.name,
    desc: dish.desc,
    tags: dish.tags || [],
    ingredients: dish.ingredients || [],
    allergens: dish.allergens || {},
  }));
  return {
    user: JSON.stringify({
      locale,
      query,
      shop: {
        name: shop?.name,
        district: shop?.district,
        type: shop?.type,
        story: shop?.story,
        hours: shop?.hours,
        payments: shop?.payments || [],
        dishes,
      },
    }),
  };
}

const INTENT_SET = new Set(["dietary", "payment", "budget", "hours", "recommendation", "forbidden"]);

// 红线后校验（QWENPAW_PLAN.md 总原则 3）：提示词是第一道防线，这里是第二道
export function validate(raw, { shop, query = "", locale = "zh", messageId = `ans-${Date.now()}` } = {}) {
  if (!raw || typeof raw.answer !== "string" || !raw.answer.trim()) throw new Error("BAD_ANSWER");
  const t = TEXT[locale] || TEXT.zh;
  const dishes = shop?.dishes || [];
  const menuIds = new Set(dishes.map((dish) => dish.id));
  const result = {
    message_id: messageId,
    source: "owner_confirmed",
    intent: INTENT_SET.has(raw.intent) ? raw.intent : "recommendation",
    risk: raw.risk === "high" ? "high" : "low",
    requires_confirmation: Boolean(raw.requires_confirmation),
    // 红线：只允许注入菜单里真实存在的 id（防幻觉），最多 3 个
    related_dish_ids: (Array.isArray(raw.related_dish_ids) ? raw.related_dish_ids : [])
      .filter((id) => menuIds.has(id))
      .slice(0, 3),
    answer: raw.answer.trim(),
  };
  // 红线：医疗/海关/法律——无论模型答了什么，一律替换为拒答模板
  if (FORBIDDEN_RX.test(query) || result.intent === "forbidden") {
    return { ...result, intent: "forbidden", risk: "high", requires_confirmation: true, related_dish_ids: [], answer: t.forbidden };
  }
  // 红线：忌口/过敏必须二次确认，推荐 id 再过一遍排除逻辑
  if (DIETARY_RX.test(query) || result.intent === "dietary") {
    const allowed = new Set(dietaryCandidates(query, dishes).map((dish) => dish.id));
    result.intent = "dietary";
    result.requires_confirmation = true;
    result.related_dish_ids = result.related_dish_ids.filter((id) => allowed.has(id));
  }
  return result;
}

export function run(input, { llm } = {}) {
  if (!llm?.enabled) return runLocal(input);
  return runLive(input, llm);
}

async function runLive(input, llm) {
  try {
    const raw = await llm.invoke("assistant", buildPrompt(input));
    return validate(parseAgentJson(raw), input);
  } catch {
    return { ...runLocal(input), degraded: true };
  }
}

