// 營銷文案 Agent（marketing-copywriter）
// 只使用店鋪檔案與已發佈菜品生成文案。紅線：不虛構折扣、獎項、成分；
// brief 提及優惠時僅以「以店內公示為準」帶過，不生成具體折扣數字。
//
// Live 模式：走 QwenPaw 文案智能體（提示詞見 prompts/marketing.md）；validate()
// 檢測到具體折扣承諾直接判違規降級（mock 對摺扣有正確話術），tags 過濾到
// 真實字段。mock 路徑同步返回（agents.test.mjs 依賴），live 路徑返回 Promise。

import { parseAgentJson } from "../lib/llm.js";

const localize = (value, lang = "zh") => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.zh || Object.values(value)[0] || "";
};

const PLATFORM_STYLE = {
  xiaohongshu: { suffix: "，一口就懂澳門日常 ✨", tone: "輕鬆種草" },
  instagram: { suffix: " — a taste of everyday Macao.", tone: "簡潔國際" },
  facebook: { suffix: "，街坊味道，歡迎路過坐低。", tone: "社羣親和" },
  wechat: { suffix: "。歡迎到店品嚐。", tone: "正式穩重" },
};

// brief 是否提及優惠（觸發公示話術與商戶提醒）
const BRIEF_DISCOUNT_RX = /折|優惠|優惠|discount|促銷|促銷/i;
// 正文/標題出現具體折扣承諾（紅線檢測：數字/中文數字+折、買贈、半價、百分比 off）
const DISCOUNT_CLAIM_RX = /[0-9０-９一二三四五六七八九十]+\s*折|折扣|買一送一|買一送一|半價|半價|\d+\s*%\s*(?:off|discount)|buy\s*one\s*get\s*one/i;
const DISCLAIMER = "（本期有店內活動，優惠詳情以店內公示為準）";
const DISCOUNT_WARNING = "brief 提及優惠：文案未生成具體折扣，請商戶自行確認後補充。";

export function runLocal({ shop, platform = "xiaohongshu", brief = "", locale = "zh" }) {
  const style = PLATFORM_STYLE[platform] || PLATFORM_STYLE.xiaohongshu;
  const dishes = shop?.dishes || [];
  const featured = dishes.find((dish) => dish.featured) || dishes[0];
  const name = localize(shop?.name);
  const story = localize(shop?.story).split(/[。.]/)[0];
  const mentionsDiscount = BRIEF_DISCOUNT_RX.test(brief);

  const bodyParts = [];
  if (story) bodyParts.push(`${story}。`);
  if (featured) bodyParts.push(`招牌「${localize(featured.name)}」MOP ${featured.price}，${localize(featured.desc)}`);
  // 紅線：brief 含優惠字樣時不逐字引用，避免把未覈實的折扣寫進公開文案
  if (brief.trim() && !mentionsDiscount) bodyParts.push(`本期主題：${brief.trim().slice(0, 60)}。`);
  if (mentionsDiscount) bodyParts.push(DISCLAIMER);

  return {
    title: featured ? `${name}的${localize(featured.name)}${style.suffix}` : `${name}${style.suffix}`,
    body: bodyParts.join(""),
    tags: [...new Set([localize(shop?.district), localize(shop?.type), "澳門美食"].filter(Boolean))],
    platform,
    tone: style.tone,
    warnings: mentionsDiscount ? [DISCOUNT_WARNING] : [],
  };
}

// —— live 路徑三段件：buildPrompt → llm.invoke → validate ——

export function buildPrompt({ shop, platform = "xiaohongshu", brief = "", locale = "zh" }) {
  // 用戶消息格式與 prompts/marketing.md 一致
  const dishes = (shop?.dishes || []).map((dish) => ({
    id: dish.id,
    featured: dish.featured || undefined,
    price: dish.price,
    name: dish.name,
    desc: dish.desc,
  }));
  return {
    user: JSON.stringify({
      platform,
      locale,
      brief,
      shop: { name: shop?.name, type: shop?.type, district: shop?.district, story: shop?.story, dishes },
    }),
  };
}

export function validate(raw, { shop, platform = "xiaohongshu", brief = "" } = {}) {
  if (!raw || typeof raw.title !== "string" || !raw.title.trim() || typeof raw.body !== "string" || !raw.body.trim()) {
    throw new Error("BAD_COPY");
  }
  // 紅線：出現具體折扣承諾——整條判違規，降級 mock（mock 對摺扣有正確話術）
  if (DISCOUNT_CLAIM_RX.test(raw.title) || DISCOUNT_CLAIM_RX.test(raw.body)) throw new Error("DISCOUNT_LEAK");

  const style = PLATFORM_STYLE[platform] || PLATFORM_STYLE.xiaohongshu;
  const warnings = (Array.isArray(raw.warnings) ? raw.warnings : []).filter((entry) => typeof entry === "string");
  let body = raw.body.trim();
  if (BRIEF_DISCOUNT_RX.test(brief)) {
    // 紅線：brief 提優惠時必須落「以店內公示為準」，並提醒商戶
    if (!body.includes("以店內公示為準")) body += DISCLAIMER;
    if (!warnings.some((entry) => /優惠|優惠|折/.test(entry))) warnings.push(DISCOUNT_WARNING);
  }
  // 紅線：tags 只能來自真實字段（防幻覺）；全被過濾時回退基礎組合
  const allowed = new Set(
    [localize(shop?.district), localize(shop?.type), "澳門美食", ...(shop?.dishes || []).map((dish) => localize(dish.name))].filter(Boolean),
  );
  let tags = (Array.isArray(raw.tags) ? raw.tags : []).filter((tag) => allowed.has(tag)).slice(0, 5);
  if (!tags.length) tags = [...new Set([localize(shop?.district), localize(shop?.type), "澳門美食"].filter(Boolean))];

  return { title: raw.title.trim(), body, tags, platform, tone: style.tone, warnings };
}

export function run(input, { llm } = {}) {
  if (!llm?.enabled) return runLocal(input);
  return runLive(input, llm);
}

async function runLive(input, llm) {
  try {
    const raw = await llm.invoke("marketing", buildPrompt(input));
    return validate(parseAgentJson(raw), input);
  } catch {
    return { ...runLocal(input), degraded: true };
  }
}

