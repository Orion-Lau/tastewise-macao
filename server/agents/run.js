// 獨立調用任意 agent（不經 HTTP、不碰數據層）：
//   node server/agents/run.js <agent> '<json-input>' [--live]
// --live：讀取 QWENPAW_* 環境變量走真平臺（單智能體調試與截圖用），
//         未配置時報錯退出；不帶 --live 一律本地 mock。
// 例：
//   node server/agents/run.js risk-checker '{"items":[{"id":"a","name":"花生西多士","allergens":{}}]}'
//   npm run agent -- assistant '{"shop":{...},"query":"可以用支付寶嗎"}' --live
// 可用 agent：assistant / menu-extractor / onboarding / translator / faq-generator / marketing / risk-checker

const argv = process.argv.slice(2);
const live = argv.includes("--live");
const [name, jsonArg] = argv.filter((arg) => arg !== "--live");
const KNOWN = ["assistant", "menu-extractor", "onboarding", "translator", "faq-generator", "marketing", "risk-checker"];

if (!KNOWN.includes(name)) {
  console.error(`用法: node server/agents/run.js <${KNOWN.join("|")}> '<json>' [--live]`);
  process.exit(1);
}

let input = {};
try {
  input = jsonArg ? JSON.parse(jsonArg) : {};
} catch (error) {
  console.error(`輸入 JSON 無法解析: ${error.message}`);
  process.exit(1);
}

let context;
if (live) {
  const { loadConfig } = await import("../config.js");
  const { createLlm } = await import("../lib/llm.js");
  const llm = createLlm(loadConfig());
  if (!llm.enabled) {
    console.error("--live 需要 QWENPAW_API_BASE 與 QWENPAW_API_KEY 環境變量（npm run agent 會自動讀 .env）");
    process.exit(1);
  }
  context = { llm };
}

const mod = await import(`./${name}.js`);
const result = await mod.run(input, context);
console.log(JSON.stringify(result, null, 2));

