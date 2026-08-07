// QwenPaw 平台环境配置：唯一入口是环境变量（变量清单见 .env.example）。
// 未配置 base+key 时 llm.enabled=false，全部 agent 自动走本地 mock——
// 演示、测试、评审现场断网都不受影响（QWENPAW_PLAN.md 总原则 2）。

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
