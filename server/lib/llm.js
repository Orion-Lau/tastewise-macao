// QwenPaw 平臺適配層。業務 Agent 只依賴 invoke()，不直接耦合平臺協議。
export function createLlm(config) {
  const enabled = Boolean(config?.apiBase);

  function buildConsoleRequest(agentName, { system, user }) {
    const text = system ? `${system}\n\n${user}` : user;
    return {
      url: `${config.apiBase}/api/console/chat`,
      agentId: config.agents[agentName] || agentName,
      body: {
        input: [{ role: "user", content: [{ type: "text", text }] }],
        session_id: `aoweizhiyi-${agentName}-${Date.now()}`,
        user_id: "aoweizhiyi-server",
        stream: true,
      },
    };
  }

  function extractConsoleText(raw) {
    let answer = "";
    for (const block of raw.split(/\r?\n\r?\n/)) {
      const line = block.split(/\r?\n/).find((entry) => entry.startsWith("data:"));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload);
        const finalMessage = Array.isArray(event?.output)
          ? event.output.findLast((item) => item?.type === "message" && item?.role === "assistant")
          : null;
        const candidates = [
          finalMessage?.content?.[0]?.text,
          event?.type === "message" && event?.role === "assistant" && event?.status === "completed"
            ? event?.content?.[0]?.text
            : null,
        ];
        const text = candidates.find((value) => typeof value === "string" && value.trim());
        if (text) answer = text;
      } catch {
        // 心跳或非 JSON SSE 事件不影響最終答案。
      }
    }
    if (!answer.trim()) throw new Error("LLM_EMPTY_RESPONSE");
    return answer.trim();
  }

  return {
    enabled,
    async invoke(agentName, { system, user, timeout = config.timeout } = {}) {
      if (!enabled) throw new Error("LLM_DISABLED");
      const { url, agentId, body } = buildConsoleRequest(agentName, { system, user });
      const headers = { "content-type": "application/json", "x-agent-id": agentId };
      if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
      });
      if (!response.ok) throw new Error(`LLM_HTTP_${response.status}`);
      return extractConsoleText(await response.text());
    },
  };
}

// 智能體按要求輸出純 JSON；同時兼容模型偶爾附加的 Markdown 代碼圍欄。
export function parseAgentJson(raw) {
  const text = String(raw).trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(text);
}

