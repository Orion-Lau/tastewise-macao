// 極簡 HTTP 工具：JSON 響應（含 CORS）、請求體讀取、multipart 字段提取。
// 參考實現零依賴，只用 node:http 原語。

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { ...CORS, "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

export function preflight(res) {
  res.writeHead(204, CORS);
  res.end();
}

const MAX_BODY = 12 * 1024 * 1024; // 契約限制上傳 10MB，留餘量

export function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error("BODY_TOO_LARGE")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export function parseJson(buf) {
  try { return JSON.parse(buf.toString("utf8") || "{}"); } catch { return {}; }
}

// 只提取文本字段與文件名/大小；參考實現不解析文件內容（正式環境由 OCR/LLM 服務處理原檔）。
export function parseMultipart(buf) {
  const text = buf.toString("latin1");
  const fields = {};
  const fieldRx = /name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n--/g;
  let match;
  while ((match = fieldRx.exec(text))) {
    fields[match[1]] = Buffer.from(match[2], "latin1").toString("utf8");
  }
  const fileMatch = text.match(/filename="([^"]*)"/);
  return {
    fields,
    filename: fileMatch ? Buffer.from(fileMatch[1], "latin1").toString("utf8") : "",
    size: buf.length,
  };
}

export function bearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

