// QwenPaw 平台适配层——全项目唯一与平台耦合的文件（QWENPAW_PLAN.md §3）。
// 平台 API 文档到手后，只需按实际形态调整 buildRequest / extractText 两处。
// 约定：invoke 成功返回模型输出字符串；任何失败（未启用/超时/HTTP 错/空响应）
// 一律抛错，由 agent 的 live 路径捕获并降级 runLocal。

export function createLlm(config) {
  const enabled = Boolean(config?.apiBase && config?.apiKey);

  // 默认按 OpenAI 兼容形态实现（chat/completions，智能体 ID 放 model 字段）。
  // 若平台实为「智能体应用 API」（如 POST {base}/agents/{id}/invoke），改这两个函数即可。
  function buildRequest(agentName, { system, user }) {
    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: user });
    return {
      url: `${config.apiBase}/chat/completions`,
      body: { model: config.agents[agentName] || agentName, messages, stream: false },
    };
  }

  function extractText(data) {
    const text = data?.choices?.[0]?.message?.content ?? data?.output?.text ?? data?.text;
    if (typeof text !== "string" || !text.trim()) throw new Error("LLM_EMPTY_RESPONSE");
    return text;
  }

  return {
    enabled,
    async invoke(agentName, { system, user, timeout = config.timeout } = {}) {
      if (!enabled) throw new Error("LLM_DISABLED");
      const { url, body } = buildRequest(agentName, { system, user });
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
      });
      if (!response.ok) throw new Error(`LLM_HTTP_${response.status}`);
      return extractText(await response.json());
    },
  };
}

// 提示词已要求「裸 JSON」，但平台仍可能包一层 markdown 围栏；
// 统一剥掉再解析，解析失败即抛错（触发调用方降级）。
export function parseAgentJson(raw) {
  const text = String(raw).trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(text);
}
