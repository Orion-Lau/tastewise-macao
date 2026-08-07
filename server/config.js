// QwenPaw 平臺環境配置：唯一入口是環境變量（變量清單見 .env.example）。
// 未配置 base+key 時 llm.enabled=false，全部 agent 自動走本地 mock——
// 演示、測試、評審現場斷網都不受影響（QWENPAW_PLAN.md 總原則 2）。

const AGENT_NAMES = ["assistant", "translator", "marketing", "faq-generator", "onboarding", "menu-extractor"];

export function loadConfig(env = process.env) {
  const agents = {};
  AGENT_NAMES.forEach((name) => {
    const value = env[`QWENPAW_AGENT_${name.toUpperCase().replaceAll("-", "_")}`];
    if (value) agents[name] = value.trim();
  });
  return {
    apiBase: (env.QWENPAW_API_BASE || "").trim().replace(/\/+$/, ""),
    apiKey: (env.QWENPAW_API_KEY || "").trim(),
    agents,
    timeout: Number(env.QWENPAW_TIMEOUT_MS) || 30000,
  };
}

