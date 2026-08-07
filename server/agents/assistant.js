// 接待問答 Agent（reception-assistant）
// 只依據調用方注入的已發佈店鋪快照回答；資料缺失時明確說不確定，
// 過敏原/忌口類回答一律要求向店員二次確認；醫療/海關/法律問題拒絕推測。
//
// Live 模式（QWENPAW_PLAN.md §3）：run(input, { llm }) 在 llm.enabled 時走
// QwenPaw 平臺（提示詞見 prompts/assistant.md），validate() 做紅線後校驗；
// 平臺失敗或輸出違規自動降級 runLocal 並帶 degraded: true。
// 注意：mock 路徑保持同步返回（agents.test.mjs 依賴此行爲），live 路徑返回
// Promise——調用方統一 await 即可兼容兩態。

import { parseAgentJson } from "../lib/llm.js";

const localize = (value, lang) => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.en || value.zh || Object.values(value)[0] || "";
};

const FORBIDDEN_RX = /醫生|醫生|藥|藥|過敏史|過敏史|診斷|診斷|海關|海關|報關|報關|簽證|簽證|法律|違法|違法/;
const DIETARY_RX = /pork|porco|豬|豬|豚|素食|vegan|vegetarian|ベジ|清真|halal|忌口|過敏|過敏|allerg|堅果|堅果|ナッツ|海鮮|海鮮|marisco|seafood/i;

const INTENTS = [
  ["forbidden", FORBIDDEN_RX],
  ["dietary", DIETARY_RX],
  ["payment", /pay|alipay|支付|付款|付き|支払|pagamento|現金|現金|澳門通|澳門通|信用卡/i],
  ["budget", /50|便宜|預算|預算|以內|以內|barato|menos|até|安い/i],
  ["hours", /幾點|幾點|營業|營業|開門|開門|關門|關門|hora|open|close|時間/i],
  ["recommendation", /.*/],
];

const TEXT = {
  zh: {
    forbidden: "抱歉，醫療、海關及法律問題超出小店可回答的範圍，請諮詢官方渠道。以下只提供店內菜單資訊。",
    dietary: (names) => `依店主已確認資料，可考慮：${names}。如屬嚴格忌口或過敏，落單前請務必再向店員確認。`,
    dietaryEmpty: "店主尚未確認相關成分資料，無法替你判斷，請直接向店員確認。",
    payment: (list) => `本店接受：${list}。實際以收銀臺最新告示為準。`,
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
    forbidden: "申し訳ありませんが、醫療・稅関・法律に関する質問はお店では回答できません。公式窓口にご確認ください。",
    dietary: (names) => `店主確認済みの情報では ${names} が候補です。厳格な制限やアレルギーは、註文前に必ずスタッフへご確認ください。`,
    dietaryEmpty: "該當する成分情報を店主がまだ確認していないため、判斷できません。スタッフに直接ご確認ください。",
    payment: (list) => `支払い方法：${list}。店頭の最新案內をご確認ください。`,
    budget: (names) => `50 MOP 以內なら ${names} があります。`,
    hours: (hours) => `営業時間：${hours}。`,
    recommendation: (name, price, desc) => `店主のおすすめは「${name}」（MOP ${price}）です。${desc}`,
  },
};

// 忌口候選過濾：runLocal 與 validate 共用同一套排除邏輯（紅線只實現一次）
function dietaryCandidates(query, dishes) {
  const wantsPork = /pork|porco|豬|豬|豚/i.test(query);
  const wantsVeg = /素食|vegan|vegetarian|ベジ/i.test(query);
  const noNuts = /堅果|堅果|花生|杏仁|nuts?\b|ナッツ|amendoim/i.test(query);
  const noSeafood = /海鮮|海鮮|seafood|marisco|魚介|蝦|蝦|蟹/i.test(query);
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

// —— live 路徑三段件：buildPrompt → llm.invoke → validate ——

export function buildPrompt({ shop, query = "", locale = "zh" }) {
  // 用戶消息格式與 prompts/assistant.md 一致；系統提示詞配置在平臺側
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

// 紅線後校驗（QWENPAW_PLAN.md 總原則 3）：提示詞是第一道防線，這裏是第二道
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
    // 紅線：只允許注入菜單裏真實存在的 id（防幻覺），最多 3 個
    related_dish_ids: (Array.isArray(raw.related_dish_ids) ? raw.related_dish_ids : [])
      .filter((id) => menuIds.has(id))
      .slice(0, 3),
    answer: raw.answer.trim(),
  };
  // 紅線：醫療/海關/法律——無論模型答了什麼，一律替換爲拒答模板
  if (FORBIDDEN_RX.test(query) || result.intent === "forbidden") {
    return { ...result, intent: "forbidden", risk: "high", requires_confirmation: true, related_dish_ids: [], answer: t.forbidden };
  }
  // 紅線：忌口/過敏必須二次確認，推薦 id 再過一遍排除邏輯
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

