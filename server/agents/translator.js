// 翻譯 Agent（menu-translator）
// 生成 en/pt/ja 菜單草稿。詞典（lexicon）由調用方注入——mock 路徑靠它出譯文。
// 紅線：輸出永遠是草稿，不自動發佈；譯文缺失時生成帶「draft」標記的佔位文本
// 並寫入 warnings，逼出人工校對。
//
// Live 模式：走 QwenPaw 翻譯智能體（提示詞見 prompts/translator.md）；validate()
// 保證條目與輸入一一對應、已有譯文不被覆蓋、永遠草稿；平臺漏譯的語種回退佔位標記。
// mock 路徑同步返回（agents.test.mjs 依賴），live 路徑返回 Promise。

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

// —— live 路徑三段件：buildPrompt → llm.invoke → validate ——

export function buildPrompt({ items = [], locales = ["en", "pt", "ja"] }) {
  // 用戶消息格式與 prompts/translator.md 一致；已有譯文一併送入（規則：非空原樣保留）
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
  // 紅線：以輸入條目爲基準逐一對應（防增刪、防順序錯亂、防 id 幻覺）
  const translated = items.map((item) => {
    const out = byId.get(item.id) || {};
    const name = { ...item.name };
    const desc = { ...item.desc };
    locales.forEach((locale) => {
      // 紅線：已有譯文原樣保留；LLM 結果只補空缺；漏譯回退佔位草稿
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
  // 紅線：永遠草稿，不自動發佈
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

