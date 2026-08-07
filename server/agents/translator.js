// 翻译 Agent（menu-translator）
// 生成 en/pt/ja 菜单草稿。词典（lexicon）由调用方注入——mock 路径靠它出译文。
// 红线：输出永远是草稿，不自动发布；译文缺失时生成带「draft」标记的占位文本
// 并写入 warnings，逼出人工校对。
//
// Live 模式：走 QwenPaw 翻译智能体（提示词见 prompts/translator.md）；validate()
// 保证条目与输入一一对应、已有译文不被覆盖、永远草稿；平台漏译的语种回退占位标记。
// mock 路径同步返回（agents.test.mjs 依赖），live 路径返回 Promise。

import { parseAgentJson } from "../lib/llm.js";

const DRAFT_MARK = { en: "(EN draft)", pt: "(rascunho PT)", ja: "（日本語ドラフト）" };

function translate(zh, locale, lexicon, warnings, kind) {
  if (!zh) return "";
  const hit = lexicon[zh]?.[locale];
  if (hit) return hit;
  warnings.push(`「${zh}」缺少 ${locale} ${kind}譯文，已生成草稿佔位，請人工翻譯。`);
  return `${zh} ${DRAFT_MARK[locale] || `(${locale} draft)`}`;
}

export function runLocal({ items = [], locales = ["en", "pt", "ja"], lexicon = {} }) {
  const warnings = [];
  const translated = items.map((item) => {
    const name = { ...item.name };
    const desc = { ...item.desc };
    locales.forEach((locale) => {
      if (!name[locale]?.trim()) name[locale] = translate(item.name?.zh, locale, lexicon, warnings, "菜名");
      if (!desc[locale]?.trim()) desc[locale] = translate(item.desc?.zh, locale, lexicon, warnings, "說明");
    });
    return { ...item, name, desc };
  });
  return { items: translated, warnings, status: "draft" };
}

// —— live 路径三段件：buildPrompt → llm.invoke → validate ——

export function buildPrompt({ items = [], locales = ["en", "pt", "ja"] }) {
  // 用户消息格式与 prompts/translator.md 一致；已有译文一并送入（规则：非空原样保留）
  return {
    user: JSON.stringify({
      locales,
      items: items.map((item) => ({ id: item.id, name: item.name, desc: item.desc })),
    }),
  };
}

export function validate(raw, { items = [], locales = ["en", "pt", "ja"] } = {}) {
  if (!raw || !Array.isArray(raw.items)) throw new Error("BAD_ITEMS");
  const warnings = (Array.isArray(raw.warnings) ? raw.warnings : []).filter((entry) => typeof entry === "string");
  const byId = new Map(raw.items.filter((item) => item && item.id != null).map((item) => [item.id, item]));
  // 红线：以输入条目为基准逐一对应（防增删、防顺序错乱、防 id 幻觉）
  const translated = items.map((item) => {
    const out = byId.get(item.id) || {};
    const name = { ...item.name };
    const desc = { ...item.desc };
    locales.forEach((locale) => {
      // 红线：已有译文原样保留；LLM 结果只补空缺；漏译回退占位草稿
      if (!name[locale]?.trim()) {
        const hit = typeof out.name?.[locale] === "string" && out.name[locale].trim();
        name[locale] = hit || translate(item.name?.zh, locale, {}, warnings, "菜名");
      }
      if (!desc[locale]?.trim()) {
        const hit = typeof out.desc?.[locale] === "string" && out.desc[locale].trim();
        desc[locale] = hit || translate(item.desc?.zh, locale, {}, warnings, "說明");
      }
    });
    return { ...item, name, desc };
  });
  // 红线：永远草稿，不自动发布
  return { items: translated, warnings, status: "draft" };
}

export function run(input, { llm } = {}) {
  if (!llm?.enabled) return runLocal(input);
  return runLive(input, llm);
}

async function runLive(input, llm) {
  try {
    const raw = await llm.invoke("translator", buildPrompt(input));
    return validate(parseAgentJson(raw), input);
  } catch {
    return { ...runLocal(input), degraded: true };
  }
}
