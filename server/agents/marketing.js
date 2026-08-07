// 营销文案 Agent（marketing-copywriter）
// 只使用店铺档案与已发布菜品生成文案。红线：不虚构折扣、奖项、成分；
// brief 提及优惠时仅以「以店內公示為準」带过，不生成具体折扣数字。
//
// Live 模式：走 QwenPaw 文案智能体（提示词见 prompts/marketing.md）；validate()
// 检测到具体折扣承诺直接判违规降级（mock 对折扣有正确话术），tags 过滤到
// 真实字段。mock 路径同步返回（agents.test.mjs 依赖），live 路径返回 Promise。

import { parseAgentJson } from "../lib/llm.js";

const localize = (value, lang = "zh") => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.zh || Object.values(value)[0] || "";
};

const PLATFORM_STYLE = {
  xiaohongshu: { suffix: "，一口就懂澳門日常 ✨", tone: "輕鬆種草" },
  instagram: { suffix: " — a taste of everyday Macao.", tone: "簡潔國際" },
  facebook: { suffix: "，街坊味道，歡迎路過坐低。", tone: "社群親和" },
  wechat: { suffix: "。歡迎到店品嚐。", tone: "正式穩重" },
};

// brief 是否提及优惠（触发公示话术与商户提醒）
const BRIEF_DISCOUNT_RX = /折|優惠|优惠|discount|促銷|促销/i;
// 正文/标题出现具体折扣承诺（红线检测：数字/中文数字+折、买赠、半价、百分比 off）
const DISCOUNT_CLAIM_RX = /[0-9０-９一二三四五六七八九十]+\s*折|折扣|買一送一|买一送一|半價|半价|\d+\s*%\s*(?:off|discount)|buy\s*one\s*get\s*one/i;
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
  // 红线：brief 含优惠字样时不逐字引用，避免把未核实的折扣写进公开文案
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

// —— live 路径三段件：buildPrompt → llm.invoke → validate ——

export function buildPrompt({ shop, platform = "xiaohongshu", brief = "", locale = "zh" }) {
  // 用户消息格式与 prompts/marketing.md 一致
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
  // 红线：出现具体折扣承诺——整条判违规，降级 mock（mock 对折扣有正确话术）
  if (DISCOUNT_CLAIM_RX.test(raw.title) || DISCOUNT_CLAIM_RX.test(raw.body)) throw new Error("DISCOUNT_LEAK");

  const style = PLATFORM_STYLE[platform] || PLATFORM_STYLE.xiaohongshu;
  const warnings = (Array.isArray(raw.warnings) ? raw.warnings : []).filter((entry) => typeof entry === "string");
  let body = raw.body.trim();
  if (BRIEF_DISCOUNT_RX.test(brief)) {
    // 红线：brief 提优惠时必须落「以店內公示為準」，并提醒商户
    if (!body.includes("以店內公示為準")) body += DISCLAIMER;
    if (!warnings.some((entry) => /優惠|优惠|折/.test(entry))) warnings.push(DISCOUNT_WARNING);
  }
  // 红线：tags 只能来自真实字段（防幻觉）；全被过滤时回退基础组合
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

