import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BadgeCheck,
  BookOpenCheck,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCopy,
  ChevronRight,
  CircleUserRound,
  Download,
  FileCheck2,
  FileSearch,
  Globe2,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  Megaphone,
  Plus,
  QrCode,
  Printer,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Store,
  UploadCloud,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { SAMPLE_SHOPS, localize } from "../data.js";
import { api, apiConfig } from "../lib/api.js";
import ThemeToggle from "./ThemeToggle.jsx";
import { copyText, uid } from "../lib/util.js";
import "./MerchantStudio.css";

const COPY = {
  zh: {
    portal: "商戶工作臺", loginTitle: "管理你的多語菜單", loginSub: "校對菜品、確認食安資料，提交後發布到遊客端。",
    account: "手機號或電郵", password: "密碼", login: "登入工作臺", demo: "進入示範工作臺",
    secure: "正式環境使用服務端身份驗證與短效工作階段。", logout: "登出", apiLive: "已連接正式 API", apiDemo: "示範資料模式",
    overview: "營運概覽", shops: "店舖與建檔", import: "導入菜單", review: "校對菜品", safety: "食安與忌口", translate: "多語言", profile: "店舖資料", faq: "常見問答", marketing: "營銷文案", insights: "遊客洞察", publish: "提交與發布",
    published: "已發布", pending: "審核中", draft: "草稿", completion: "資料完成度", dishes: "菜品數量", questions: "本週提問",
    workflow: "本次菜單更新", workflowSub: "按順序完成，提交後由平臺審核高風險資料。", continue: "繼續處理",
    recent: "最近動態", importTitle: "上傳現有菜單", importSub: "原檔會送往識別 API，並生成可逐項修改的菜品草稿。",
    shopName: "店舖名稱", file: "菜單檔案", formats: "PDF、JPG、PNG、HEIC · 最大 10MB", choose: "選擇檔案", start: "開始識別",
    processing: "正在上傳與識別…", imported: "已生成菜品草稿", emptyUpload: "請先選擇菜單檔案。",
    reviewTitle: "校對菜名、價格與分類", reviewSub: "識別結果可能有誤，請以店內實際菜單為準。", add: "新增菜品", save: "保存草稿", saved: "草稿已保存",
    nameZh: "中文菜名", price: "價格 MOP", category: "分類", recommended: "店主推介", soldout: "暫時售罄", remove: "刪除",
    safetyTitle: "逐道確認食安資料", safetySub: "這些資料會直接顯示給旅客；不確定時請不要勾選。", confirmDish: "確認此菜", confirmed: "已確認", confirmAll: "確認全部菜品",
    pork: "含豬肉", beef: "含牛肉", seafood: "含海鮮", nuts: "含堅果", eggdairy: "含蛋奶", vegetarian: "素食可選",
    translateTitle: "檢查多語言菜單", translateSub: "自動翻譯只生成草稿，發布前仍需人工校對。", generate: "生成缺少的翻譯", generating: "正在生成…", coverage: "翻譯完成度",
    dishName: "菜名", description: "一句話說明", submitTitle: "提交審核與發布", submitSub: "平臺會核對過敏原等高風險字段，不影響目前線上菜單。",
    ready: "可以提交", notReady: "仍有項目未完成", submit: "提交審核", submitting: "正在提交…", submitted: "已提交，平臺審核中",
    onlineMenu: "目前線上菜單", qrHelp: "此為真實 QR Code，可下載後印在桌牌或收銀臺。", downloadQr: "下載 QR Code", preview: "預覽遊客頁",
    groupMenu: "菜單更新流程", groupShop: "店舖經營", groupGrowth: "增長工具",
  },
  en: {
    portal: "Merchant workspace", loginTitle: "Manage your multilingual menu", loginSub: "Review dishes, confirm safety details and submit updates for publishing.",
    account: "Phone or email", password: "Password", login: "Sign in", demo: "Open demo workspace",
    secure: "Production uses server authentication and short-lived sessions.", logout: "Sign out", apiLive: "Production API connected", apiDemo: "Demo data mode",
    overview: "Overview", shops: "Shops & onboarding", import: "Import menu", review: "Review dishes", safety: "Food safety", translate: "Languages", profile: "Shop profile", faq: "FAQ", marketing: "Marketing copy", insights: "Visitor insights", publish: "Submit & publish",
    published: "Published", pending: "In review", draft: "Draft", completion: "Completion", dishes: "Dishes", questions: "Questions this week",
    workflow: "Current menu update", workflowSub: "Complete each step. High-risk fields are reviewed after submission.", continue: "Continue",
    recent: "Recent activity", importTitle: "Upload your current menu", importSub: "The source file is sent to the extraction API and becomes an editable draft.",
    shopName: "Shop name", file: "Menu file", formats: "PDF, JPG, PNG, HEIC · up to 10MB", choose: "Choose file", start: "Start extraction",
    processing: "Uploading and extracting…", imported: "Dish draft created", emptyUpload: "Choose a menu file first.",
    reviewTitle: "Review names, prices and categories", reviewSub: "Extraction can be wrong. Your actual in-store menu is the source of truth.", add: "Add dish", save: "Save draft", saved: "Draft saved",
    nameZh: "Chinese name", price: "Price MOP", category: "Category", recommended: "Owner's pick", soldout: "Sold out", remove: "Remove",
    safetyTitle: "Confirm food-safety details", safetySub: "Travellers see these fields directly. Leave anything uncertain unchecked.", confirmDish: "Confirm dish", confirmed: "Confirmed", confirmAll: "Confirm all",
    pork: "Contains pork", beef: "Contains beef", seafood: "Contains seafood", nuts: "Contains nuts", eggdairy: "Egg/dairy", vegetarian: "Vegetarian option",
    translateTitle: "Review multilingual menu", translateSub: "Automatic translations are drafts and still need a human review.", generate: "Generate missing translations", generating: "Generating…", coverage: "Translation coverage",
    dishName: "Dish name", description: "Short description", submitTitle: "Submit review and publish", submitSub: "The platform reviews high-risk fields without replacing the current live menu.",
    ready: "Ready to submit", notReady: "Some steps are incomplete", submit: "Submit for review", submitting: "Submitting…", submitted: "Submitted for platform review",
    onlineMenu: "Current live menu", qrHelp: "This is a real QR code ready for a table card or counter.", downloadQr: "Download QR code", preview: "Preview visitor page",
    groupMenu: "Menu update flow", groupShop: "Shop operations", groupGrowth: "Growth tools",
  },
};

// 側邊導航按職能分組：菜單更新是有順序的流程（與 Overview 步驟條一致，顯示 01–05），
// 店鋪經營與增長工具爲平級功能。
const NAV_GROUPS = [
  { key: null, items: [["overview", LayoutDashboard]] },
  { key: "groupMenu", items: [["import", UploadCloud], ["review", FileSearch], ["safety", ShieldCheck], ["translate", Globe2], ["publish", QrCode]] },
  { key: "groupShop", items: [["shops", Store], ["profile", Settings2], ["faq", HelpCircle]] },
  { key: "groupGrowth", items: [["marketing", Megaphone], ["insights", BarChart3]] },
];
const NAV_KEYS = { overview: "overview", shops: "shops", import: "import", review: "review", safety: "safety", translate: "translate", profile: "profile", faq: "faq", marketing: "marketing", insights: "insights", publish: "publish" };
const ALLERGENS = ["pork", "beef", "seafood", "nuts", "eggdairy", "vegetarian"];
const LOCALES = ["en", "pt", "ja"];
// 分類的存儲值必須用 API 契約的穩定 id（與遊客端 CATEGORIES 一致），中文只作顯示。
const CATEGORY_OPTIONS = [
  { id: "main", label: "主食" }, { id: "snack", label: "小食" }, { id: "drink", label: "飲品" },
  { id: "dessert", label: "甜品" }, { id: "gift", label: "手信" },
];
const LEGACY_CATEGORY = { 主食: "main", 小食: "snack", 飲品: "drink", 甜品: "dessert", 手信: "gift" };

function normalizeCategory(value) {
  if (CATEGORY_OPTIONS.some((option) => option.id === value)) return value;
  return LEGACY_CATEGORY[value] || "main";
}

function toItem(dish, confirmed = true) {
  const names = dish.name || { zh: dish.name_zh, en: dish.name_en, pt: dish.name_pt, ja: dish.name_ja };
  const descriptions = dish.desc || dish.description || { zh: dish.desc_zh, en: dish.desc_en, pt: dish.desc_pt, ja: dish.desc_ja };
  const ingredients = (dish.ingredients || []).join(" ");
  const tags = (dish.tags || []).join(" ");
  const provided = dish.allergens || dish.alg || {};
  return {
    id: dish.id || uid(),
    name: { zh: localize(names, "zh"), en: localize(names, "en"), pt: localize(names, "pt"), ja: localize(names, "ja") },
    desc: { zh: localize(descriptions, "zh"), en: localize(descriptions, "en"), pt: localize(descriptions, "pt"), ja: localize(descriptions, "ja") },
    price: Number(dish.price) || 0,
    category: normalizeCategory(dish.category),
    recommended: Boolean(dish.featured ?? dish.recommended), soldout: Boolean(dish.soldout ?? dish.sold_out), confirmed,
    allergens: {
      pork: Boolean(provided.pork ?? tags.includes("含豬肉")), beef: Boolean(provided.beef ?? ingredients.includes("牛")), seafood: Boolean(provided.seafood ?? /海鮮|蝦|蟹|魚/.test(ingredients)),
      nuts: Boolean(provided.nuts ?? provided.nut ?? /堅果|花生|杏仁/.test(`${ingredients} ${tags}`)), eggdairy: Boolean(provided.eggdairy ?? provided.egg_dairy ?? /蛋|奶/.test(`${ingredients} ${tags}`)), vegetarian: Boolean(provided.vegetarian ?? /素食|純素/.test(tags)),
    },
  };
}

function ProgressRing({ value }) {
  return <div className="ms-ring" style={{ "--progress": `${value * 3.6}deg` }}><span>{value}<small>%</small></span></div>;
}

function Login({ t, onDone }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (!apiConfig.configured) { onDone(); return; }
    if (!identifier || !password) { setError("Please enter your account and password."); return; }
    setLoading(true); setError("");
    try { await api.login(identifier, password); onDone(); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return (
    <main className="ms-login">
      <div className="ms-login-brand"><span>味</span><strong>澳味智譯</strong><small>TASTEWISE MACAO · {t.portal}</small></div>
      <div className="ms-login-grid">
        <section className="ms-login-story">
          <span className="ms-kicker">MERCHANT CONSOLE</span>
          <h1>{t.loginTitle}</h1><p>{t.loginSub}</p>
          <div className="ms-login-steps"><i>錄</i><span /><i>校</i><span /><i>譯</i><span /><i>發</i></div>
        </section>
        <form className="ms-login-card" onSubmit={submit}>
          <CircleUserRound size={25} /><h2>{t.portal}</h2>
          <label>{t.account}<input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="+853 6xxx xxxx / name@shop.mo" /></label>
          <label>{t.password}<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" /></label>
          {error ? <p className="ms-error"><AlertCircle size={14} />{error}</p> : null}
          <button className="ms-primary" type="submit" disabled={loading}>{loading ? <Loader2 className="spin" size={17} /> : <LockKeyhole size={17} />}{apiConfig.configured ? t.login : t.demo}</button>
          {apiConfig.configured ? <button className="ms-forgot" onClick={async () => { if (!identifier) { setError("請先輸入手機號碼或電郵。"); return; } setError(""); try { await api.requestPasswordReset(identifier); setResetMessage("如果賬號存在，重設密碼鏈接已經發送。"); } catch (nextError) { setError(nextError.message); } }} type="button">忘記密碼？</button> : null}
          {resetMessage ? <p className="ms-reset-message">{resetMessage}</p> : null}
          <small><ShieldCheck size={13} />{t.secure}</small>
        </form>
      </div>
    </main>
  );
}

export default function MerchantStudio({ lang, onPreview }) {
  const t = COPY[lang] || COPY.zh;
  const [authenticated, setAuthenticated] = useState(() => apiConfig.configured && api.hasSession());
  const [active, setActive] = useState("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [merchantShops, setMerchantShops] = useState(() => apiConfig.configured ? [] : SAMPLE_SHOPS);
  const [activeShopId, setActiveShopId] = useState(() => apiConfig.configured ? "" : SAMPLE_SHOPS[0].id);
  const [shopName, setShopName] = useState(() => apiConfig.configured ? "" : localize(SAMPLE_SHOPS[0].name, "zh"));
  const [items, setItems] = useState(() => apiConfig.configured ? [] : SAMPLE_SHOPS[0].dishes.map((dish) => toItem(dish, true)));
  const [status, setStatus] = useState(() => apiConfig.configured ? "draft" : "published");
  const [dashboard, setDashboard] = useState({ questions: apiConfig.configured ? 0 : 26, activities: [] });
  const [dataState, setDataState] = useState({ loading: false, error: "" });
  const [notice, setNotice] = useState("");
  const [qrData, setQrData] = useState("");
  const shopId = activeShopId;
  const activeShop = merchantShops.find((shop) => shop.id === shopId) || null;
  const publicUrl = shopId ? `${window.location.origin}/?shop=${encodeURIComponent(shopId)}` : "";

  const activateShop = (shop) => {
    if (!shop) return;
    setActiveShopId(shop.id);
    setShopName(localize(shop.name || shop.name_zh, "zh"));
    setItems((shop.dishes || shop.items || shop.products || []).map((dish) => toItem(dish, Boolean(dish.confirmed ?? true))));
    // review_status 優先：審覈中/被退回時商戶端要看到流程狀態，
    // 而遊客端仍按 publication_status 展示線上菜單（版本隔離）
    setStatus(shop.review_status || shop.publication_status || shop.status || "draft");
  };

  useEffect(() => {
    if (!authenticated || !apiConfig.configured) return;
    let activeRequest = true;
    setDataState({ loading: true, error: "" });
    Promise.all([api.getMerchantShops(lang), api.getMerchantDashboard(lang)])
      .then(([shopPayload, dashboardPayload]) => {
        if (!activeRequest) return;
        const list = Array.isArray(shopPayload) ? shopPayload : shopPayload.shops || [];
        setMerchantShops(list);
        setDashboard({ questions: dashboardPayload.questions_this_week ?? dashboardPayload.questions ?? 0, activities: dashboardPayload.activities || [] });
        if (list.length) activateShop(list.find((shop) => shop.id === activeShopId) || list[0]);
        else setActive("shops");
        setDataState({ loading: false, error: "" });
      })
      .catch((error) => { if (activeRequest) setDataState({ loading: false, error: error.message }); });
    return () => { activeRequest = false; };
  }, [authenticated, lang]);

  useEffect(() => { if (publicUrl) QRCode.toDataURL(publicUrl, { width: 420, margin: 2, color: { dark: "#20342fff", light: "#fffdf8ff" } }).then(setQrData); else setQrData(""); }, [publicUrl]);
  if (!authenticated) return <Login t={t} onDone={() => setAuthenticated(true)} />;

  const translationTotal = Math.max(items.length * LOCALES.length * 2, 1);
  const translationDone = items.reduce((sum, item) => sum + LOCALES.reduce((n, code) => n + (item.name?.[code]?.trim() ? 1 : 0) + (item.desc?.[code]?.trim() ? 1 : 0), 0), 0);
  const translationPct = Math.round((translationDone / translationTotal) * 100);
  const safetyPct = items.length ? Math.round(items.filter((item) => item.confirmed).length / items.length * 100) : 0;
  const completion = Math.round((Math.min(100, translationPct) + safetyPct + (items.length ? 100 : 0)) / 3);

  const logout = () => { api.logout(); setAuthenticated(false); };
  const select = (key) => { setActive(key); setMobileNav(false); setNotice(""); };
  const navLabel = (key) => t[NAV_KEYS[key]];

  return (
    <main className="ms-shell">
      <header className="ms-topbar">
        <button className="ms-menu" onClick={() => setMobileNav((v) => !v)} type="button" aria-label="Menu">{mobileNav ? <X /> : <Menu />}</button>
        <div className="ms-work-brand"><span>味</span><div><strong>澳味智譯</strong><small>{t.portal}</small></div></div>
        <label className="ms-shop-switch"><Store size={16} /><span><small>{status === "published" ? t.published : status === "pending" ? t.pending : t.draft}</small><select value={activeShopId} onChange={(event) => activateShop(merchantShops.find((shop) => shop.id === event.target.value))}>{merchantShops.length ? merchantShops.map((shop) => <option value={shop.id} key={shop.id}>{localize(shop.name || shop.name_zh, "zh")}</option>) : <option value="">尚未建立店舖</option>}</select></span><ChevronRight size={15} /></label>
        <div className="ms-api-badge"><i className={apiConfig.configured ? "live" : ""} />{apiConfig.configured ? t.apiLive : t.apiDemo}</div>
        <ThemeToggle className="ms-theme" />
        <button className="ms-logout" onClick={logout} type="button"><LogOut size={15} />{t.logout}</button>
      </header>
      <aside className={`ms-sidebar ${mobileNav ? "open" : ""}`}>
        <nav>{NAV_GROUPS.map((group, groupIndex) => <div className="ms-nav-group" key={group.key || groupIndex}>{group.key ? <small className="ms-nav-label">{t[group.key]}</small> : null}{group.items.map(([key, Icon], index) => <button className={active === key ? "active" : ""} onClick={() => select(key)} type="button" key={key}><span>{group.key === "groupMenu" ? String(index + 1).padStart(2, "0") : "·"}</span><Icon size={17} />{navLabel(key)}{key === "publish" && status === "pending" ? <i /> : null}</button>)}</div>)}</nav>
        <div className="ms-side-progress"><ProgressRing value={completion} /><span><strong>{t.completion}</strong><small>{items.length} {t.dishes}</small></span></div>
      </aside>
      <section className="ms-main">
        {dataState.loading ? <div className="ms-data-state"><Loader2 className="spin" />正在讀取商戶資料…</div> : null}
        {dataState.error ? <div className="ms-data-state error"><AlertCircle />{dataState.error}</div> : null}
        {notice ? <div className="ms-notice"><CheckCircle2 size={16} />{notice}<button onClick={() => setNotice("")} type="button"><X size={14} /></button></div> : null}
        {active === "overview" ? <Overview t={t} items={items} completion={completion} safetyPct={safetyPct} translationPct={translationPct} status={status} questions={dashboard.questions} activities={dashboard.activities} onGo={select} /> : null}
        {active === "shops" ? <ShopsPanel t={t} lang={lang} shops={merchantShops} activeShopId={activeShopId} onSelect={(shop) => { activateShop(shop); select("overview"); }} onCreated={(shop) => { setMerchantShops((old) => [...old, shop]); activateShop(shop); setNotice("店舖已建立，請繼續校對資料。"); select("review"); }} /> : null}
        {active === "import" ? <ImportPanel t={t} lang={lang} shopName={shopName} setShopName={setShopName} onItems={(next) => { setItems(next); setStatus("draft"); setNotice(t.imported); select("review"); }} /> : null}
        {active === "review" ? <ReviewPanel t={t} items={items} setItems={setItems} shopId={shopId} setNotice={setNotice} onNext={() => select("safety")} /> : null}
        {active === "safety" ? <SafetyPanel t={t} items={items} setItems={setItems} onNext={() => select("translate")} /> : null}
        {active === "translate" ? <TranslationPanel t={t} items={items} setItems={setItems} shopId={shopId} coverage={translationPct} onNext={() => select("publish")} /> …2425 tokens truncated…ize={16} />}保存 FAQ</button></div>
  </div>;
}

function MarketingPanel({ t, lang, shopId }) {
  const [platform, setPlatform] = useState("xiaohongshu"); const [brief, setBrief] = useState(""); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [copied, setCopied] = useState(false);
  const generate = async () => { setLoading(true); setError(""); try { if (apiConfig.configured) setResult(await api.generateMarketingCopy({ shopId, platform, brief, locale: lang })); else { await new Promise((resolve) => setTimeout(resolve, 550)); setResult({ title: "街坊茶餐廳的一口鑊氣", body: "乾炒牛河即叫即炒，河粉乾身、牛肉嫩滑。來十月初五街坐下，慢慢喫一頓澳門日常。", tags: ["澳門美食", "十月初五街", "茶餐廳"] }); } } catch (nextError) { setError(nextError.message); } finally { setLoading(false); } };
  const copy = async () => { const text = `${result.title || ""}\n\n${result.body || ""}\n\n${(result.tags || []).map((tag) => `#${tag}`).join(" ")}`; if (await copyText(text)) { setCopied(true); setTimeout(() => setCopied(false), 1200); } };
  return <div><PageHead kicker="CONTENT STUDIO" title={t.marketing} sub="營銷 Agent 只能使用店鋪檔案和已發佈商品，不會虛構折扣、獎項或成分。" />
    <section className="ms-panel ms-marketing"><div className="ms-platforms">{[["xiaohongshu", "小紅書"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["wechat", "微信公眾號"]].map(([id, label]) => <button className={platform === id ? "active" : ""} onClick={() => setPlatform(id)} type="button" key={id}>{label}</button>)}</div><label>本次推廣情境<textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="例如：中秋將至，主推杏仁餅禮盒；不可虛構折扣。" /></label><button className="ms-primary" onClick={generate} disabled={loading || !shopId} type="button">{loading ? <Loader2 className="spin" size={16} /> : <Megaphone size={16} />}{loading ? "正在生成…" : "生成平臺文案"}</button>{error ? <p className="ms-error"><AlertCircle size={14} />{error}</p> : null}</section>
    {result ? <article className="ms-panel ms-copy-result"><div><span>{platform}</span><button onClick={copy} type="button"><ClipboardCopy size={14} />{copied ? "已複製" : "複製全文"}</button></div><h2>{result.title}</h2><p>{result.body}</p><footer>{(result.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}</footer></article> : null}
  </div>;
}

function InsightsPanel({ t, shopId, dashboard }) {
  const [range, setRange] = useState("30d"); const [data, setData] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (!shopId) return; setLoading(true); setError(""); if (apiConfig.configured) api.getInsights(shopId, range).then(setData).catch((nextError) => setError(nextError.message)).finally(() => setLoading(false)); else { setTimeout(() => { setData({ total_questions: dashboard.questions || 26, staff_confirmation_rate: 19, categories: [{ key: "recommendation", label: "招牌推介", count: 11 }, { key: "payment", label: "支付方式", count: 6 }, { key: "dietary", label: "忌口需求", count: 5 }, { key: "allergen", label: "過敏原", count: 4 }], unanswered: 2 }); setLoading(false); }, 350); } }, [shopId, range]);
  const max = Math.max(...(data?.categories || []).map((row) => row.count), 1);
  return <div><PageHead kicker="ANONYMOUS INSIGHTS" title={t.insights} sub="只保存分類統計與反饋，不保存遊客身份或完整對話原文。" action={<select className="ms-range" value={range} onChange={(event) => setRange(event.target.value)}><option value="7d">最近 7 天</option><option value="30d">最近 30 天</option><option value="90d">最近 90 天</option></select>} />
    {loading ? <div className="ms-data-state"><Loader2 className="spin" />正在讀取洞察…</div> : error ? <div className="ms-data-state error"><AlertCircle />{error}</div> : data ? <><div className="ms-stat-grid"><Stat label="累計提問" value={data.total_questions || 0} tone="red" /><Stat label="需店員確認" value={`${data.staff_confirmation_rate || 0}%`} /><Stat label="未命中問題" value={data.unanswered || 0} /><Stat label="有幫助率" value={`${data.helpful_rate || 0}%`} tone="green" /></div><section className="ms-panel ms-insight-chart"><h2>提問類別分佈</h2>{(data.categories || []).map((row) => <div key={row.key || row.label}><span>{row.label || row.key}</span><i><b style={{ width: `${Math.max(5, row.count / max * 100)}%` }} /></i><strong>{row.count}</strong></div>)}<p><ShieldCheck size={15} />“需店員確認”比例偏高時，建議補充成分資料或 FAQ，接待 Agent 才能可靠回答。</p></section></> : null}
  </div>;
}

function Overview({ t, items, completion, safetyPct, translationPct, status, questions, activities, onGo }) {
  const steps = [["import", 100], ["review", items.length ? 100 : 0], ["safety", safetyPct], ["translate", translationPct], ["publish", status === "published" ? 100 : status === "pending" ? 85 : 0]];
  const rows = activities?.length ? activities : apiConfig.configured ? [] : [
    { title: "菜單資料已同步到遊客頁", time: "今天 10:24", type: "publish" },
    { title: "5 道菜完成食安確認", time: "昨天 18:40", type: "safety" },
    { title: "英文、葡文、日文翻譯已更新", time: "6 月 30 日", type: "translation" },
  ];
  return <div>
    <PageHead kicker="DASHBOARD" title={t.overview} sub={`${new Date().toLocaleDateString()} · ${status === "published" ? t.published : status === "pending" ? t.pending : t.draft}`} />
    <div className="ms-stat-grid"><Stat label={t.completion} value={`${completion}%`} tone="red" /><Stat label={t.dishes} value={items.length} /><Stat label={t.questions} value={questions} /><Stat label={t.publish} value={status === "published" ? t.published : status === "pending" ? t.pending : t.draft} tone="green" /></div>
    <section className="ms-panel ms-workflow"><div className="ms-panel-head"><div><h2>{t.workflow}</h2><p>{t.workflowSub}</p></div><button onClick={() => onGo(steps.find(([, pct]) => pct < 100)?.[0] || "publish")} type="button">{t.continue}<ArrowRight size={15} /></button></div>
      <div className="ms-step-row">{steps.map(([key, pct], i) => <button onClick={() => onGo(key)} type="button" key={key}><span className={pct === 100 ? "done" : ""}>{pct === 100 ? <Check size={14} /> : i + 1}</span><strong>{t[NAV_KEYS[key]]}</strong><small>{pct}%</small>{i < steps.length - 1 ? <i style={{ "--fill": `${pct}%` }} /> : null}</button>)}</div>
    </section>
    <section className="ms-panel ms-activity"><h2>{t.recent}</h2>{rows.length ? rows.map((row, index) => <div key={row.id || index}>{row.type === "safety" ? <ShieldCheck size={17} /> : row.type === "translation" ? <Globe2 size={17} /> : <BadgeCheck size={17} />}<span><strong>{row.title || row.message}</strong><small>{row.time || row.created_at}</small></span></div>) : <p className="ms-inline-empty">暫時沒有動態。</p>}</section>
  </div>;
}

function Stat({ label, value, tone = "" }) { return <div className={`ms-stat ${tone}`}><span>{label}</span><strong>{value}</strong><i /></div>; }

function ImportPanel({ t, lang, shopName, setShopName, onItems }) {
  const [file, setFile] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const input = useRef(null); const cameraInput = useRef(null);
  const choose = (next) => { if (!next) return; if (next.size > 10 * 1024 * 1024) { setError("File exceeds 10MB."); return; } setFile(next); setError(""); };
  const submit = async () => { if (!file) { setError(t.emptyUpload); return; } setLoading(true); setError(""); try { let source; if (apiConfig.configured) { const result = await api.importMenu({ shopName, locale: lang, file }); source = result.items || result.dishes; if (!Array.isArray(source)) throw new Error("API 未返回 items 或 dishes 數組"); } else { await new Promise((r) => setTimeout(r, 900)); source = SAMPLE_SHOPS[0].dishes; } onItems(source.map((dish) => toItem(dish, false))); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  return <div><PageHead kicker="MENU IMPORT" title={t.importTitle} sub={t.importSub} />
    <section className="ms-panel ms-import-panel"><label>{t.shopName}<input value={shopName} onChange={(e) => setShopName(e.target.value)} /></label><span className="ms-field-title">{t.file}</span>
      <div className={`ms-dropzone ${file ? "selected" : ""}`}><input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,image/*,application/pdf" onChange={(e) => choose(e.target.files?.[0])} /><input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={(e) => choose(e.target.files?.[0])} />{file ? <FileCheck2 size={33} /> : <UploadCloud size={33} />}<strong>{file?.name || t.choose}</strong><small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : t.formats}</small><div className="ms-upload-buttons"><button onClick={() => input.current?.click()} type="button">{t.choose}</button><button onClick={() => cameraInput.current?.click()} type="button"><Camera size={13} />拍照上傳</button></div></div>
      {error ? <p className="ms-error"><AlertCircle size={14} />{error}</p> : null}<button className="ms-primary ms-wide" onClick={submit} disabled={loading} type="button">{loading ? <><Loader2 className="spin" size={17} />{t.processing}</> : <>{t.start}<ArrowRight size={16} /></>}</button>
    </section></div>;
}

function ReviewPanel({ t, items, setItems, shopId, setNotice, onNext }) {
  const [saving, setSaving] = useState(false);
  const patch = (id, key, value) => setItems((old) => old.map((item) => item.id === id ? { ...item, [key]: value } : item));
  const save = async () => { setSaving(true); try { if (apiConfig.configured) await api.saveMenuDraft({ shopId, items }); else await new Promise((r) => setTimeout(r, 450)); setNotice(t.saved); } finally { setSaving(false); } };
  const add = () => setItems((old) => [...old, { ...toItem({ id: uid(), name: { zh: "" }, desc: { zh: "" }, price: 0, category: "main" }, false) }]);
  return <div><PageHead kicker="PROOFREAD" title={t.reviewTitle} sub={t.reviewSub} action={<button className="ms-outline" onClick={add} type="button"><Plus size={15} />{t.add}</button>} />
    <div className="ms-review-list">{items.map((item, index) => <article className="ms-review-row" key={item.id}><span className="ms-row-no">{String(index + 1).padStart(2, "0")}</span><label>{t.nameZh}<input value={item.name.zh} onChange={(e) => setItems((old) => old.map((x) => x.id === item.id ? { ...x, name: { ...x.name, zh: e.target.value } } : x))} /></label><label>{t.price}<input type="number" value={item.price} onChange={(e) => patch(item.id, "price", Number(e.target.value))} /></label><label>{t.category}<select value={item.category} onChange={(e) => patch(item.id, "category", e.target.value)}>{CATEGORY_OPTIONS.map((cat) => <option value={cat.id} key={cat.id}>{cat.label}</option>)}</select></label><div className="ms-row-toggles"><button className={item.recommended ? "on" : ""} onClick={() => patch(item.id, "recommended", !item.recommended)} type="button"><Check size={12} />{t.recommended}</button><button className={item.soldout ? "on danger" : ""} onClick={() => patch(item.id, "soldout", !item.soldout)} type="button"><Check size={12} />{t.soldout}</button></div><button className="ms-remove" onClick={() => setItems((old) => old.filter((x) => x.id !== item.id))} type="button" aria-label={t.remove}><X size={16} /></button></article>)}</div>
    <div className="ms-actions"><button className="ms-outline" onClick={save} disabled={saving} type="button">{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}{t.save}</button><button className="ms-primary" onClick={onNext} disabled={!items.length || items.some((item) => !item.name.zh || item.price < 0)} type="button">{t.safety}<ArrowRight size={16} /></button></div>
  </div>;
}

function SafetyPanel({ t, items, setItems, onNext }) {
  const toggle = (id, key) => setItems((old) => old.map((item) => item.id === id ? { ...item, confirmed: false, allergens: { ...item.allergens, [key]: !item.allergens[key] } } : item));
  const confirm = (id) => setItems((old) => old.map((item) => item.id === id ? { ...item, confirmed: true } : item));
  const done = items.every((item) => item.confirmed);
  return <div><PageHead kicker="FOOD SAFETY" title={t.safetyTitle} sub={t.safetySub} action={<span className={`ms-ready ${done ? "yes" : ""}`}><ShieldCheck size={15} />{items.filter((x) => x.confirmed).length}/{items.length}</span>} />
    <div className="ms-safety-list">{items.map((item, index) => <article className={`ms-safety-row ${item.confirmed ? "confirmed" : ""}`} key={item.id}><div className="ms-safety-name"><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.name.zh}</strong><small>MOP {item.price}</small></div>{item.confirmed ? <BadgeCheck size={18} /> : null}</div><div className="ms-allergen-grid">{ALLERGENS.map((key) => <button className={item.allergens[key] ? "on" : ""} onClick={() => toggle(item.id, key)} type="button" key={key}><Check size={12} />{t[key]}</button>)}</div><button className="ms-confirm" onClick={() => confirm(item.id)} type="button">{item.confirmed ? <><CheckCircle2 size={15} />{t.confirmed}</> : <>{t.confirmDish}<ArrowRight size={14} /></>}</button></article>)}</div>
    <div className="ms-actions"><button className="ms-outline" onClick={() => setItems((old) => old.map((item) => ({ ...item, confirmed: true })))} type="button"><ShieldCheck size={16} />{t.confirmAll}</button><button className="ms-primary" disabled={!done} onClick={onNext} type="button">{t.translate}<ArrowRight size={16} /></button></div>
  </div>;
}

function TranslationPanel({ t, items, setItems, shopId, coverage, onNext }) {
  const [locale, setLocale] = useState("en"); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const update = (id, field, value) => setItems((old) => old.map((item) => item.id === id ? { ...item, [field]: { ...item[field], [locale]: value } } : item));
  const generate = async () => { setLoading(true); setError(""); try { if (apiConfig.configured) { const result = await api.translateMenu({ shopId, items }); if (!Array.isArray(result.items)) throw new Error("API 未返回翻譯後的 items 數組"); setItems(result.items.map((item) => toItem(item, item.confirmed))); } else { await new Promise((r) => setTimeout(r, 650)); setItems((old) => old.map((item) => ({ ...item, name: { ...item.name, [locale]: item.name[locale] || item.name.en || item.name.zh }, desc: { ...item.desc, [locale]: item.desc[locale] || item.desc.en || item.desc.zh } }))); } } catch (nextError) { setError(nextError.message); } finally { setLoading(false); } };
  return <div><PageHead kicker="TRANSLATIONS" title={t.translateTitle} sub={t.translateSub} action={<div className="ms-coverage"><span>{t.coverage}</span><strong>{coverage}%</strong></div>} />
    <div className="ms-language-tabs">{LOCALES.map((code) => <button className={locale === code ? "active" : ""} onClick={() => setLocale(code)} type="button" key={code}>{code.toUpperCase()}<span>{items.filter((item) => item.name[code] && item.desc[code]).length}/{items.length}</span></button>)}<button className="generate" onClick={generate} disabled={loading} type="button">{loading ? <Loader2 className="spin" size={15} /> : <Globe2 size={15} />}{loading ? t.generating : t.generate}</button></div>{error ? <p className="ms-error"><AlertCircle size={14} />{error}</p> : null}
    <div className="ms-translation-list">{items.map((item) => <article key={item.id}><div><strong>{item.name.zh}</strong><small>{item.desc.zh}</small></div><label>{t.dishName}<input value={item.name[locale] || ""} onChange={(e) => update(item.id, "name", e.target.value)} /></label><label>{t.description}<textarea value={item.desc[locale] || ""} onChange={(e) => update(item.id, "desc", e.target.value)} /></label></article>)}</div>
    <div className="ms-actions"><button className="ms-primary" disabled={coverage < 100} onClick={onNext} type="button">{t.publish}<ArrowRight size={16} /></button></div>
  </div>;
}

function PublishPanel({ t, items, status, setStatus, rejectionReason, shopId, safetyPct, translationPct, qrData, publicUrl, onPreview }) {
  const [loading, setLoading] = useState(false); const [copied, setCopied] = useState(false); const [svgUrl, setSvgUrl] = useState(""); const [error, setError] = useState(""); const ready = items.length > 0 && safetyPct === 100 && translationPct === 100;
  useEffect(() => { let oldUrl = ""; if (publicUrl) QRCode.toString(publicUrl, { type: "svg", margin: 2, color: { dark: "#20342f", light: "#fffdf8" } }).then((svg) => { oldUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })); setSvgUrl(oldUrl); }); return () => { if (oldUrl) URL.revokeObjectURL(oldUrl); }; }, [publicUrl]);
  const submit = async () => { setLoading(true); setError(""); try { if (apiConfig.configured) await api.submitMenu({ shopId, items }); else await new Promise((r) => setTimeout(r, 650)); setStatus("pending"); } catch (nextError) { setError(nextError.message); } finally { setLoading(false); } };
  return <div><PageHead kicker="PUBLISH" title={t.submitTitle} sub={t.submitSub} />
    {status === "rejected" ? <div className="ms-rejected"><AlertCircle size={18} /><span><strong>本次更新被退回</strong><small>{rejectionReason || "請根據平臺意見修改後重新提交。"}</small></span></div> : null}{error ? <p className="ms-error"><AlertCircle size={14} />{error}</p> : null}
    <div className="ms-publish-grid"><section className="ms-panel ms-submit-card"><div className={`ms-submit-state ${ready ? "ready" : ""}`}>{ready ? <CheckCircle2 size={25} /> : <AlertCircle size={25} />}<div><strong>{ready ? t.ready : t.notReady}</strong><small>{status === "pending" ? t.submitted : `${items.length} ${t.dishes}`}</small></div></div><div className="ms-checklist"><p><FileSearch /><span>{t.review}<small>{items.length} / {items.length}</small></span><CheckCircle2 /></p><p><ShieldCheck /><span>{t.safety}<small>{safetyPct}%</small></span>{safetyPct === 100 ? <CheckCircle2 /> : <AlertCircle />}</p><p><Globe2 /><span>{t.translate}<small>{translationPct}%</small></span>{translationPct === 100 ? <CheckCircle2 /> : <AlertCircle />}</p></div><button className="ms-primary ms-wide" disabled={!ready || loading || status === "pending"} onClick={submit} type="button">{loading ? <><Loader2 className="spin" size={16} />{t.submitting}</> : status === "pending" ? <><BookOpenCheck size={16} />{t.submitted}</> : <><Send size={16} />{status === "rejected" ? "重新提交審覈" : t.submit}</>}</button></section>
      <section className="ms-panel ms-qr-card print-card"><div><span className="ms-kicker">LIVE MENU</span><h2>{t.onlineMenu}</h2><p>{t.qrHelp}</p></div>{qrData ? <img src={qrData} alt="Menu QR code" /> : <Loader2 className="spin" />}<code>{publicUrl}</code><div className="ms-material-actions">{qrData ? <a className="ms-outline" href={qrData} download="aoweizhiyi-menu-qr.png"><Download size={15} />PNG</a> : null}{svgUrl ? <a className="ms-outline" href={svgUrl} download="aoweizhiyi-menu-qr.svg"><Download size={15} />SVG</a> : null}<button className="ms-outline" onClick={async () => { if (await copyText(publicUrl)) { setCopied(true); setTimeout(() => setCopied(false), 1200); } }} type="button"><ClipboardCopy size={15} />{copied ? "已複製" : "複製連結"}</button><button className="ms-outline" onClick={() => window.print()} type="button"><Printer size={15} />列印桌牌</button><button className="ms-primary" onClick={onPreview} type="button">{t.preview}<ArrowRight size={15} /></button></div></section></div>
  </div>;
}

