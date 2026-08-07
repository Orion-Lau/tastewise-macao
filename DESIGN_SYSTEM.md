# 澳味智译 · 視覺與體驗規範 v1.1

> 本規範定義澳味智译三端共用的視覺語言：色彩令牌、字階、陰影與動效語言、狀態語義。

## 0. 創作立場：提純，而非推翻

現有視覺骨架（墨青 × 紙白 × 福隆紅 × 金，碎石路波浪、直書招牌、印章、mono 小標）
繼承自 LocalBridge，方向是對的，且已有辨識度。**本系統不做風格重啟**，做三件事：

1. **系統化**：把散落的 40+ 處裸色值、20+ 種隨手字號、15 種圓角收進三層令牌；
2. **提純**：修正無障礙硬傷（7–9px 正文字、金色文字對比不足、十種微差綠）；
3. **一筆科技光**：以「霓虹」為唯一的現代性語彙，克制地用於「有生命的東西」。

---

## 1. 設計原則（五條）

| # | 原則 | 含義 | 判例 |
|---|------|------|------|
| 1 | **紙上乾坤** | 內容永遠放在紙面（暖白）上；墨青只做環境與結構，不做閱讀底色 | 長文出現在深底上＝違例 |
| 2 | **蓋章有聲** | 交互要有物理感：按下即蓋章（陰影收平）、鬆手即回彈；反饋 ≤120ms | 主按鈕 `:active` 位移至陰影原位 |
| 3 | **霓虹點睛** | 外發光（glow）只給「活的東西」：實時數據、AI 產出、可掃碼物。每屏最多 2 處 | 給普通卡片加 glow＝違例 |
| 4 | **四語同席** | 中英葡日平權：佈局必須容忍 +40% 文本膨脹（葡語最長）；價格與數字一律 mono | 定寬 chip 塞葡語＝違例 |
| 5 | **讓一步給內容** | 菜與店是主角。裝飾紋樣每個表面最多一種；chrome 的對比永遠低於內容 | 同一卡片疊格紋+軌環+碎石＝違例 |

---

## 2. 色彩系統

### 2.1 原色層（primitives）

沿用現值命名收編，不改主色相：

```css
/* 墨青 ink */
--ink-900: #182823;  --ink-800: #20342f;  --ink-700: #2b3f38;
--ink-600: #34453f;  --ink-500: #4a5a52;
/* 紙 paper */
--paper-0: #fffcf5;  --paper-100: #faf5e8;  --paper-200: #f4efe3;
--paper-300: #e9e0ca; --paper-400: #e0d4b6;  --line: #d8cfba;
/* 福隆紅 red */
--red-300: #d9705c;  --red-500: #b83d2d;  --red-700: #8f2b20;  --red-800: #7e281f;
/* 餅金 gold */
--gold-200: #f2cf7f; --gold-300: #dfb759; --gold-500: #b98b38; --gold-700: #8a672a;
/* 瓷磚藍 azulejo（澳門街道門牌的鈷藍） */
--azulejo-300: #65a6c8; --azulejo-500: #365c7d; --azulejo-700: #27465b;
/* 苔綠 moss（唯一合法的成功/在線綠） */
--moss-100: #e6eee2; --moss-500: #5d8c69; --moss-700: #4f7054;
```

### 2.2 語義層（semantic）——組件只允許引用這一層

```css
--surface:        var(--paper-200);   /* 頁面底 */
--surface-raised: var(--paper-0);     /* 卡片 */
--surface-sunken: var(--paper-300);   /* 分區帶、骨架屏 */
--surface-inverse: var(--ink-800);    /* 深色環境（hero/侧栏顶栏） */
--text:           var(--ink-800);
--text-secondary: var(--ink-600);
--text-muted:     #6f7a73;            /* 僅限 ≥12px 文本 */
--text-on-inverse: var(--paper-200);
--accent:         var(--red-500);     /* 全局品牌行動色 */
--accent-pressed: var(--red-700);
--live:           var(--moss-500);    /* 實時/在線，允許 glow */
--danger:         var(--red-700);
--warn-bg: #f4edda; --warn-text: #796026;
```

### 2.3 三端角色色（環境提示，不改行動色）

主行動按鈕**三端統一福隆紅**（品牌一致）；角色色只用於「你在哪一端」的環境信號：
側欄選中高亮條、kicker、進度環、圖表主色。

| 端 | 角色色 | 語義 |
|----|--------|------|
| 遊客端 | 福隆紅 `--red-500` | 街市、食慾、煙火氣 |
| 商戶端 | 餅金 `--gold-500` | 賬房、手藝、爐火 |
| 平台端 | 瓷磚藍 `--azulejo-500` | 門牌、公證、秩序 |

### 2.4 對比度規則（硬性）

- 正文（≥12px）對比 ≥ 4.5:1；銘牌小字（mono 大寫、加寬字距）≥ 3:1。
- **金色禁止在紙面上做正文/小字**（#b98b38 on #f4efe3 僅 ≈2.5:1）；
  紙面上的金色只可做裝飾線、圖形、大號數字；文字要金請用 `--gold-700`。
- 深底上金色（`--gold-300`）自由使用。

---

## 3. 字體排印

### 3.1 字階（七級，取名以便溝通）

| 級名 | 尺寸 | 字體 | 用途 |
|------|------|------|------|
| 招牌 display | `clamp(38px, 5.2vw, 67px)` / 1.22 | serif 500 | 首屏大標 |
| 匾額 title-xl | `clamp(28px, 4vw, 36px)` / 1.3 | serif 500 | 頁級標題 |
| 題頭 title | 22–25px / 1.35 | serif 500 | 卡片/區塊標題 |
| 小題 heading | 16–18px / 1.45 | serif 600 或 sans 700 | 條目標題 |
| 正文 body | 13.5–14px / 1.8 | sans 400 | 敘述文本 |
| 注 note | 12px / 1.7 | sans 400 | 輔助說明（**連續文本下限**） |
| 銘 label | 10–11px / 1.2 | mono，UPPERCASE，字距 ≥.12em | kicker、徽章、表頭 |

**硬規則**：7–9px 一律廢除。現有 7px/7.5px/8px/8.5px/9px 文本按語義升到
「銘」（若是標籤性質）或「注」（若是句子）。銘牌永不排整句。

### 3.2 字體棧（維持系統字體——內地網絡環境不引外部字體）

```css
--serif: Georgia, "Songti TC", "Songti SC", "Noto Serif TC", serif;
--sans: -apple-system, BlinkMacSystemFont, "PingFang TC", "PingFang SC", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
--mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
```

（如未來允許自托管字體，display 級首選「思源宋體 Heavy」，僅 subset 首屏用字。）

### 3.3 多語規則

- 葡語按鈕/標籤文案按 zh×1.4 預留；chip 一律 `flex-wrap`，禁定寬。
- 日文禁用負字距（`letter-spacing < 0` 僅限 zh/en display）。
- 價格恆為 `MOP + mono 數字`，全端統一。

---

## 4. 空間、圓角、海拔

### 4.1 空間（4px 網格）

```css
--s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 20px;
--s6: 24px; --s7: 32px; --s8: 40px; --s9: 48px; --s10: 64px; --s11: 96px;
```
現存 13/17/19/21/27/29/31px 等奇數值遷移到最近檔位。頁殼寬恆 `min(1160px, 100% - 48px)`。

### 4.2 圓角（六檔）

```css
--r-chip: 4px;   /* 印章、tag、soldout 角標 */
--r-input: 8px;  /* 輸入框、小按鈕 */
--r-btn: 10px;   /* 主按鈕 */
--r-card: 16px;  /* 卡片 */
--r-panel: 20px; /* 面板、對話框 */
--r-pill: 999px;
```

### 4.3 海拔——兩種陰影語言，一元擇一

| 語言 | 值 | 授權對象 | 規則 |
|------|-----|---------|------|
| **章壓 chop** | `3px 3px 0 <實色>`（小）/ `5px 5px 0`（大） | 品牌章、招牌、主按鈕、step 圖標 | 必須實色（同色系 700/800 檔），禁 rgba；`:active` 收平為 0 並位移補齊 |
| **浮紙 lift** | `0 12px 30px rgba(32,52,47,.08–.12)` | 卡片 hover、對話框、下拉 | 禁與章壓同體出現 |

現存混血（如 `.step-icon` 的 `3px 3px 0 rgba(...)`）改為實色章壓。

---

## 5. 紋樣庫與使用規則

| 紋樣 | 來源 | 授權表面 | 密度上限 |
|------|------|---------|---------|
| 碎石路波浪 `.calcada` | 葡式碎石路 | 深色區塊底邊、頁腳頂邊 | 每視口 ≤2 條 |
| 百子櫃格紋 | 老藥材舖抽屜牆 | 深色 hero/CTA 背景 | opacity ≤ .09 |
| 軌環 orbit | 蛋撻焦圈/羅盤 | 卡片藝術區、對話框藝術區 | 每表面 ≤2 環 |
| 紙內框 inset border | 老菜單紙 | menu-paper、featured-dish | 距邊 8–17px 單線 |

**每個表面最多一種主紋樣**（軌環可作點綴疊加，但透明度 ≤.22）。

---

## 6. 動效語言

```css
--t-tap: 120ms;  --t-hover: 180ms;  --t-enter: 240ms;  --t-stage: 400ms;
--ease-brush: cubic-bezier(.2, .7, .3, 1);   /* 起筆快收筆穩 */
```

| 模式 | 定義 | 已實現 | 用途 |
|------|------|--------|------|
| 蓋章 press | `:active` 位移+陰影收平，--t-tap | ✅ | 一切章壓元素 |
| 揭紙 reveal | 淡入+上浮 14px，--ease-brush，錯峰 55ms | ✅ | 列表/卡片入場 |
| 流光 shimmer | 1.6s 掃光 | ✅ | 骨架屏專用 |
| **霓虹息 breathe** | glow 2.4s 呼吸（box-shadow 擴縮） | ⬜ Phase 2 | live 圓點、AI 生成標記、QR 卡 |
| **換場 crossfade** | 視圖切換 240ms 淡入 | ⬜ Phase 2 | 三端路由切換 |

全部動效受 `prefers-reduced-motion` 保護（已有基建，新增模式必須掛入）。
**教訓存檔**：入場動畫永遠包一層容器（`.reveal`），不與元素自身的 `:hover transform` 同體——
`animation-fill-mode: forwards` 會鎖死 transform。

---

## 7. 圖標與印章

- 圖標庫維持 lucide，線寬 1.5px；尺寸只取 13 / 15 / 17 / 20 / 26。
- **印章形制**（圓環+單字 serif）保留為最高身份等級：店徽、菜印、部門章（遊客「味」、商戶「錄」、平台「審」）。印章永不與 lucide 圖標並列在同一視覺層。

---

## 8. 組件規範（摘要）

| 組件 | 規範要點 |
|------|---------|
| 主按鈕 | 紅底白字 + 章壓影；`:hover` 上浮 1px、`:active` 蓋章；高度 44–48px（觸控下限） |
| 次按鈕 |…104937 tokens truncated…)} type="button">{item.confirmed ? <><CheckCircle2 size={15} />{t.confirmed}</> : <>{t.confirmDish}<ArrowRight size={14} /></>}</button></article>)}</div>
    <div className="ms-actions"><button className="ms-outline" onClick={() => setItems((old) => old.map((item) => ({ ...item, confirmed: true })))} type="button"><ShieldCheck size={16} />{t.confirmAll}</button><button className="ms-primary" disabled={!done} onClick={onNext} type="button">{t.translate}<ArrowRight size={16} /></button></div>
  </div>;
}

function TranslationPanel({ t, items, setItems, shopId, coverage, onNext }) {
  const [locale, setLocale] = useState("en"); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const update = (id, field, value) => setItems((old) => old.map((item) => item.id === id ? { ...item, [field]: { ...item[field], [locale]: value } } : item));
  const generate = async () => { setLoading(true); setError(""); try { if (apiConfig.configured) { const result = await api.translateMenu({ shopId, items }); if (!Array.isArray(result.items)) throw new Error("API 未返回翻译后的 items 数组"); setItems(result.items.map((item) => toItem(item, item.confirmed))); } else { await new Promise((r) => setTimeout(r, 650)); setItems((old) => old.map((item) => ({ ...item, name: { ...item.name, [locale]: item.name[locale] || item.name.en || item.name.zh }, desc: { ...item.desc, [locale]: item.desc[locale] || item.desc.en || item.desc.zh } }))); } } catch (nextError) { setError(nextError.message); } finally { setLoading(false); } };
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
    {status === "rejected" ? <div className="ms-rejected"><AlertCircle size={18} /><span><strong>本次更新被退回</strong><small>{rejectionReason || "请根据平台意见修改后重新提交。"}</small></span></div> : null}{error ? <p className="ms-error"><AlertCircle size={14} />{error}</p> : null}
    <div className="ms-publish-grid"><section className="ms-panel ms-submit-card"><div className={`ms-submit-state ${ready ? "ready" : ""}`}>{ready ? <CheckCircle2 size={25} /> : <AlertCircle size={25} />}<div><strong>{ready ? t.ready : t.notReady}</strong><small>{status === "pending" ? t.submitted : `${items.length} ${t.dishes}`}</small></div></div><div className="ms-checklist"><p><FileSearch /><span>{t.review}<small>{items.length} / {items.length}</small></span><CheckCircle2 /></p><p><ShieldCheck /><span>{t.safety}<small>{safetyPct}%</small></span>{safetyPct === 100 ? <CheckCircle2 /> : <AlertCircle />}</p><p><Globe2 /><span>{t.translate}<small>{translationPct}%</small></span>{translationPct === 100 ? <CheckCircle2 /> : <AlertCircle />}</p></div><button className="ms-primary ms-wide" disabled={!ready || loading || status === "pending"} onClick={submit} type="button">{loading ? <><Loader2 className="spin" size={16} />{t.submitting}</> : status === "pending" ? <><BookOpenCheck size={16} />{t.submitted}</> : <><Send size={16} />{status === "rejected" ? "重新提交审核" : t.submit}</>}</button></section>
      <section className="ms-panel ms-qr-card print-card"><div><span className="ms-kicker">LIVE MENU</span><h2>{t.onlineMenu}</h2><p>{t.qrHelp}</p></div>{qrData ? <img src={qrData} alt="Menu QR code" /> : <Loader2 className="spin" />}<code>{publicUrl}</code><div className="ms-material-actions">{qrData ? <a className="ms-outline" href={qrData} download="aoweizhiyi-menu-qr.png"><Download size={15} />PNG</a> : null}{svgUrl ? <a className="ms-outline" href={svgUrl} download="aoweizhiyi-menu-qr.svg"><Download size={15} />SVG</a> : null}<button className="ms-outline" onClick={async () => { if (await copyText(publicUrl)) { setCopied(true); setTimeout(() => setCopied(false), 1200); } }} type="button"><ClipboardCopy size={15} />{copied ? "已複製" : "複製連結"}</button><button className="ms-outline" onClick={() => window.print()} type="button"><Printer size={15} />列印桌牌</button><button className="ms-primary" onClick={onPreview} type="button">{t.preview}<ArrowRight size={15} /></button></div></section></div>
  </div>;
}
