// QwenPaw 平臺適配層——全項目唯一與平臺耦合的文件（QWENPAW_PLAN.md §3）。
// 平臺 API 文檔到手後，只需按實際形態調整 buildRequest / extractText 兩處。
// 約定：invoke 成功返回模型輸出字符串；任何失敗（未啓用/超時/HTTP 錯/空響應）
// 一律拋錯，由 agent 的 live 路徑捕獲並降級 runLocal。

export function createLlm(config) {
  const enabled = Boolean(config?.apiBase && config?.apiKey);

  // 默認按 OpenAI 兼容形態實現（chat/completions，智能體 ID 放 model 字段）。
  // 若平臺實爲「智能體應用 API」（如 POST {base}/agents/{id}/invoke），改這兩個函數即可。
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

// 提示詞已要求「裸 JSON」，但平臺仍可能包一層 markdown 圍欄；
// 統一剝掉再解析，解析失敗即拋錯（觸發調用方降級）。
export function parseAgentJson(raw) {
  const text = String(raw).trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(text);
}

