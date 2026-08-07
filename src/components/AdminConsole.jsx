import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowRight, BadgeCheck, CheckCircle2, ChevronDown, ClipboardCheck,
  Clock3, FileWarning, Loader2, LockKeyhole, LogOut, MessageSquareText, Search,
  ShieldAlert, ShieldCheck, Store, UserRoundCog, XCircle,
} from "lucide-react";
import { api, apiConfig } from "../lib/api.js";
import { uid } from "../lib/util.js";
import ThemeToggle from "./ThemeToggle.jsx";
import "./AdminConsole.css";

const DEMO_REVIEWS = [
  { id: "review-101", type: "new_shop", shop_name: "安記咖啡美食", submitted_at: "今天 09:42", items: [
    { id: "a1", name: "沙嗲牛肉公仔麵", description: "花生沙嗲汁配牛肉", price: 42, allergens: { beef: true, nuts: false } },
    { id: "a2", name: "火腿蛋治", description: "火腿、雞蛋和牛油多士", price: 28, allergens: { pork: false, eggdairy: true } },
  ] },
  { id: "review-102", type: "menu_update", shop_name: "新順興茶餐廳", submitted_at: "昨天 17:26", items: [
    { id: "b1", name: "葡國雞飯", description: "椰香咖喱焗雞", price: 58, allergens: { eggdairy: true } },
  ] },
];
const DEMO_FEEDBACK = [
  { id: "f1", shop_name: "新順興茶餐廳", helpful: false, category: "dietary", created_at: "今天 11:20" },
  { id: "f2", shop_name: "榮記餅家", helpful: true, category: "recommendation", created_at: "今天 10:04" },
];
const DEMO_AUDIT = [
  { id: "l1", actor: "admin@tastewise.mo", action: "approve_menu", target: "榮記餅家", created_at: "昨天 16:30" },
  { id: "l2", actor: "merchant@sansonheng.mo", action: "submit_menu", target: "新順興茶餐廳", created_at: "昨天 15:58" },
];

function riskFlags(item) {
  const text = `${item.name || ""} ${item.description || ""}`;
  const flags = [];
  if (/花生|杏仁|堅果|合桃/.test(text) && !(item.allergens?.nuts || item.allergens?.nut)) flags.push("文字提及堅果，但未勾選含堅果");
  if (/火腿|豬|肉鬆|叉燒/.test(text) && !item.allergens?.pork) flags.push("文字提及豬肉製品，但未勾選含豬肉");
  if (/蝦|蟹|魚|海鮮/.test(text) && !item.allergens?.seafood) flags.push("文字提及海鮮，但未勾選含海鮮");
  return flags;
}

function AdminLogin({ onDone }) {
  const [identifier, setIdentifier] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const submit = async (event) => { event.preventDefault(); if (!apiConfig.configured) { onDone(); return; } if (!identifier || !password) { setError("請輸入管理員賬號和密碼。"); return; } setLoading(true); setError(""); try { await api.adminLogin(identifier, password); onDone(); } catch (nextError) { setError(nextError.message); } finally { setLoading(false); } };
  return <main className="admin-login"><div className="admin-login-mark"><span>審</span><strong>澳味智譯</strong><small>PLATFORM REVIEW</small></div><form onSubmit={submit}><UserRoundCog size={27} /><span>INTERNAL ACCESS</span><h1>平臺審覈後臺</h1><p>審覈新店、菜單更新與高風險字段，並保留完整操作記錄。</p><label>管理員賬號<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="admin@tastewise.mo" /></label><label>密碼<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" /></label>{error ? <div className="admin-error"><AlertCircle size={14} />{error}</div> : null}<button type="submit" disabled={loading}>{loading ? <Loader2 className="spin" /> : <LockKeyhole />}{apiConfig.configured ? "安全登錄" : "進入示範審覈臺"}</button><small><ShieldCheck size={13} />正式環境應由服務端驗證管理員角色與操作權限。</small></form></main>;
}

export default function AdminConsole() {
  const [authenticated, setAuthenticated] = useState(() => apiConfig.configured && api.hasSession("admin"));
  const [tab, setTab] = useState("reviews");
  const [reviews, setReviews] = useState(() => apiConfig.configured ? [] : DEMO_REVIEWS);
  const [feedback, setFeedback] = useState(() => apiConfig.configured ? [] : DEMO_FEEDBACK);
  const [audit, setAudit] = useState(() => apiConfig.configured ? [] : DEMO_AUDIT);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [expanded, setExpanded] = useState(""); const [rejecting, setRejecting] = useState(""); const [reason, setReason] = useState("");
  const totalFlags = useMemo(() => reviews.reduce((sum, review) => sum + (review.items || []).reduce((n, item) => n + riskFlags(item).length, 0), 0), [reviews]);

  useEffect(() => {
    if (!authenticated || !apiConfig.configured) return;
    setLoading(true); setError("");
    Promise.all([api.getAdminQueue(), api.getAdminFeedback(), api.getAdminAuditLog()])
      .then(([queueResult, feedbackResult, auditResult]) => { setReviews(Array.isArray(queueResult) ? queueResult : queueResult.reviews || []); setFeedback(Array.isArray(feedbackResult) ? feedbackResult : feedbackResult.feedback || []); setAudit(Array.isArray(auditResult) ? auditResult : auditResult.logs || []); })
      .catch((nextError) => setError(nextError.message)).finally(() => setLoading(false));
  }, [authenticated]);

  if (!authenticated) return <AdminLogin onDone={() => setAuthenticated(true)} />;
  const decide = async (review, decision) => { if (decision === "reject" && !reason.trim()) return; setLoading(true); try { if (apiConfig.configured) await api.decideReview(review.id, { decision, reason }); else await new Promise((resolve) => setTimeout(resolve, 350)); setReviews((old) => old.filter((item) => item.id !== review.id)); setAudit((old) => [{ id: uid(), actor: "current_admin", action: decision === "approve" ? "approve_review" : "reject_review", target: review.shop_name, created_at: "剛剛" }, ...old]); setRejecting(""); setReason(""); } catch (nextError) { setError(nextError.message); } finally { setLoading(false); } };

  return <main className="admin-shell"><header><div><span>審</span><strong>澳味智譯</strong><small>平臺審覈</small></div><div className="admin-api"><i className={apiConfig.configured ? "live" : ""} />{apiConfig.configured ? "Production API" : "Demo mode"}</div><ThemeToggle className="admin-theme" /><button onClick={() => { api.logout("admin"); setAuthenticated(false); }} type="button"><LogOut size={15} />登出</button></header><aside><nav><button className={tab === "reviews" ? "active" : ""} onClick={() => setTab("reviews")} type="button"><ClipboardCheck />待審覈<span>{reviews.length}</span></button><button className={tab === "feedback" ? "active" : ""} onClick={() => setTab("feedback")} type="button"><MessageSquareText />遊客反饋<span>{feedback.length}</span></button><button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")} type="button"><Clock3 />操作日誌</button></nav><p><ShieldCheck size={14} />自動風險檢查僅供參考，最終決定必須由人工管理員作出。</p></aside><section className="admin-main">{loading ? <div className="admin-state"><Loader2 className="spin" />正在讀取平臺資料…</div> : null}{error ? <div className="admin-state error"><AlertCircle />{error}</div> : null}
    {tab === "reviews" ? <><div className="admin-title"><div><span>REVIEW QUEUE</span><h1>待審覈項目</h1><p>檢查文字、價格、翻譯和過敏原字段。</p></div><div><strong>{reviews.length}</strong><small>待審覈</small></div><div className="risk"><strong>{totalFlags}</strong><small>風險提示</small></div></div>{reviews.length ? <div className="admin-review-list">{reviews.map((review) => <article key={review.id}><button className="admin-review-head" onClick={() => setExpanded(expanded === review.id ? "" : review.id)} type="button"><span className={review.type === "new_shop" ? "new" : "update"}>{review.type === "new_shop" ? "新店" : "更新"}</span><div><strong>{review.shop_name}</strong><small>{review.submitted_at || review.created_at} · {(review.items || []).length} 道菜</small></div><i>{(review.items || []).reduce((sum, item) => sum + riskFlags(item).length, 0)} 項風險</i><ChevronDown size={17} /></button>{expanded === review.id ? <div className="admin-review-body">{(review.items || []).map((item) => { const flags = riskFlags(item); return <div className={flags.length ? "flagged" : ""} key={item.id}><span>{item.name}</span><p>{item.description}</p><strong>MOP {item.price}</strong>{flags.length ? <ul>{flags.map((flag) => <li key={flag}><FileWarning size={13} />{flag}</li>)}</ul> : <small><BadgeCheck size={13} />自動檢查未發現矛盾</small>}</div>; })}<footer>{rejecting === review.id ? <div className="reject-box"><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="填寫退回原因，商戶將看到這段內容。" /><button onClick={() => setRejecting("")} type="button">取消</button><button disabled={!reason.trim()} onClick={() => decide(review, "reject")} type="button">確認退回</button></div> : <><button className="reject" onClick={() => setRejecting(review.id)} type="button"><XCircle />退回修改</button><button className="approve" onClick={() => decide(review, "approve")} type="button"><CheckCircle2 />審覈通過</button></>}</footer></div> : null}</article>)}</div> : <div className="admin-empty"><ClipboardCheck /><h2>暫時沒有待審覈項目</h2><p>商戶提交新店或菜單更新後會出現在這裏。</p></div>}</> : null}
    {tab === "feedback" ? <AdminTable title="遊客反饋" rows={feedback} columns={["shop_name", "category", "helpful", "created_at"]} /> : null}
    {tab === "audit" ? <AdminTable title="操作與修改日誌" rows={audit} columns={["created_at", "actor", "action", "target"]} /> : null}
  </section></main>;
}

function AdminTable({ title, rows, columns }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase();
  const visible = needle
    ? rows.filter((row) => columns.some((column) => String(row[column] ?? "").toLocaleLowerCase().includes(needle)))
    : rows;
  return <div><div className="admin-title"><div><span>PLATFORM DATA</span><h1>{title}</h1><p>數據由後臺 API 返回。</p></div><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索" /></label></div><div className="admin-table"><div>{columns.map((column) => <strong key={column}>{column}</strong>)}</div>{visible.length ? visible.map((row) => <div key={row.id}>{columns.map((column) => <span key={column}>{typeof row[column] === "boolean" ? row[column] ? "有幫助" : "沒幫助" : row[column] ?? "—"}</span>)}</div>) : <p className="admin-table-empty">沒有匹配的記錄。</p>}</div></div>;
}

