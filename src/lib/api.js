const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const environmentToken = import.meta.env.VITE_API_TOKEN || "";
// 商户与管理员令牌分开保存：商户登录后打开 /?page=admin 不应被视为已登录管理员，
// 管理员令牌也不应发给商户接口。
const TOKEN_KEYS = {
  merchant: "aoweizhiyi_access_token",
  admin: "aoweizhiyi_admin_token",
};

function readStoredToken(scope) {
  try {
    return window.sessionStorage.getItem(TOKEN_KEYS[scope]) || "";
  } catch {
    return "";
  }
}

function storeToken(scope, token) {
  try {
    window.sessionStorage.setItem(TOKEN_KEYS[scope], token);
  } catch {
    // sessionStorage 不可用（如隐私模式）时令牌只存在于本次内存请求中
  }
}

function scopeForPath(path) {
  return path.startsWith("/v1/admin") ? "admin" : "merchant";
}

function accessToken(path = "") {
  return readStoredToken(scopeForPath(path)) || environmentToken;
}

export const apiConfig = {
  baseUrl,
  configured: Boolean(baseUrl),
};

async function request(path, options = {}) {
  if (!baseUrl) throw new Error("API_NOT_CONFIGURED");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeout || 20000);
  const isForm = options.body instanceof FormData;

  try {
    const token = accessToken(path);
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.message || payload.error || `HTTP ${response.status}`;
      throw new Error(message);
    }
    return payload.data ?? payload;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("REQUEST_TIMEOUT");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  async login(identifier, password) {
    const result = await request("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    const nextToken = result.access_token || result.token;
    if (nextToken) storeToken("merchant", nextToken);
    return result;
  },

  async adminLogin(identifier, password) {
    const result = await request("/v1/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    const nextToken = result.access_token || result.token;
    if (nextToken) storeToken("admin", nextToken);
    return result;
  },

  requestPasswordReset(identifier) {
    return request("/v1/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });
  },

  logout(scope = "merchant") {
    try {
      window.sessionStorage.removeItem(TOKEN_KEYS[scope]);
    } catch {
      // ignore
    }
  },

  hasSession(scope = "merchant") {
    return Boolean(readStoredToken(scope) || environmentToken);
  },

  getShops(locale = "zh") {
    return request(`/v1/shops?city=macao&locale=${encodeURIComponent(locale)}`, { method: "GET" });
  },

  getShop(shopId, locale = "zh") {
    return request(`/v1/shops/${encodeURIComponent(shopId)}?locale=${encodeURIComponent(locale)}`, { method: "GET" });
  },

  askShop(shopId, query, locale = "zh") {
    return request(`/v1/shops/${encodeURIComponent(shopId)}/assistant`, {
      method: "POST",
      body: JSON.stringify({ query, locale }),
    });
  },

  submitFeedback({ shopId, messageId, helpful, category = "assistant_answer" }) {
    return request(`/v1/shops/${encodeURIComponent(shopId)}/feedback`, {
      method: "POST",
      body: JSON.stringify({ message_id: messageId, helpful, category }),
    });
  },

  importMenu({ shopName, locale = "zh", file }) {
    const body = new FormData();
    body.append("shop_name", shopName);
    body.append("locale", locale);
    body.append("menu", file, file.name);
    return request("/v1/merchant/menu-import", {
      method: "POST",
      body,
      timeout: 60000,
    });
  },

  getMerchantDashboard(locale = "zh") {
    return request(`/v1/merchant/dashboard?locale=${encodeURIComponent(locale)}`, { method: "GET" });
  },

  getMerchantShops(locale = "zh") {
    return request(`/v1/merchant/shops?locale=${encodeURIComponent(locale)}`, { method: "GET" });
  },

  createShop({ description, menuText, locale = "zh" }) {
    return request("/v1/merchant/shops", {
      method: "POST",
      body: JSON.stringify({ description, menu_text: menuText, locale }),
      timeout: 60000,
    });
  },

  updateShopProfile(shopId, profile) {
    return request(`/v1/merchant/shops/${encodeURIComponent(shopId)}`, {
      method: "PUT",
      body: JSON.stringify(profile),
    });
  },

  uploadShopMedia(shopId, file, kind = "cover") {
    const body = new FormData();
    body.append("kind", kind);
    body.append("file", file, file.name);
    return request(`/v1/merchant/shops/${encodeURIComponent(shopId)}/media`, {
      method: "POST",
      body,
      timeout: 60000,
    });
  },

  saveMenuDraft({ shopId, items }) {
    return request(`/v1/merchant/shops/${encodeURIComponent(shopId)}/menu-draft`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
  },

  translateMenu({ shopId, items, locales = ["en", "pt", "ja"] }) {
    return request(`/v1/merchant/shops/${encodeURIComponent(shopId)}/translate`, {
      method: "POST",
      body: JSON.stringify({ items, locales }),
      timeout: 60000,
    });
  },

  getFaqs(shopId, locale = "zh") {
    return request(`/v1/merchant/shops/${encodeURIComponent(shopId)}/faqs?locale=${encodeURIComponent(locale)}`, { method: "GET" });
  },

  saveFaqs(shopId, faqs) {
    return request(`/v1/merchant/shops/${encodeURIComponent(shopId)}/faqs`, {
      method: "PUT",
      body: JSON.stringify({ faqs }),
    });
  },

  generateFaqs(shopId, locale = "zh") {
    return request(`/v1/merchant/shops/${encodeURIComponent(shopId)}/faqs/generate`, {
      method: "POST",
      body: JSON.stringify({ locale }),
      timeout: 60000,
    });
  },

  generateMarketingCopy({ shopId, platform, brief, locale = "zh" }) {
    return request(`/v1/merchant/shops/${encodeURIComponent(shopId)}/marketing-copy`, {
      method: "POST",
      body: JSON.stringify({ platform, brief, locale }),
      timeout: 60000,
    });
  },

  getInsights(shopId, range = "30d") {
    return request(`/v1/merchant/shops/${encodeURIComponent(shopId)}/insights?range=${encodeURIComponent(range)}`, { method: "GET" });
  },

  submitMenu({ shopId, items }) {
    return request(`/v1/merchant/shops/${encodeURIComponent(shopId)}/menu-submit`, {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  getAdminQueue() {
    return request("/v1/admin/reviews?status=pending", { method: "GET" });
  },

  getAdminFeedback() {
    return request("/v1/admin/feedback", { method: "GET" });
  },

  getAdminAuditLog() {
    return request("/v1/admin/audit-log", { method: "GET" });
  },

  decideReview(reviewId, { decision, reason = "" }) {
    return request(`/v1/admin/reviews/${encodeURIComponent(reviewId)}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, reason }),
    });
  },
};

export function normalizeShops(payload) {
  const shops = Array.isArray(payload) ? payload : payload?.shops;
  if (!Array.isArray(shops)) return [];
  return shops.map((shop, index) => ({
    ...shop,
    accent: shop.accent || ["clay", "gold", "blue"][index % 3],
    monogram: shop.monogram || shop.name?.zh?.slice(0, 1) || shop.name?.slice?.(0, 1) || "味",
    rating: shop.rating || 4.5,
    priceLevel: shop.price_level || shop.priceLevel || "$$",
    payments: shop.payments || [],
    dishes: shop.dishes || shop.items || [],
    faqs: shop.faqs || shop.faq || [],
  }));
}
