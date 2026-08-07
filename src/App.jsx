import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Languages,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  QrCode,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  UtensilsCrossed,
  WalletCards,
  X,
} from "lucide-react";
import { CATEGORIES, localize, SAMPLE_SHOPS } from "./data.js";
import { getCopy, LANGS } from "./i18n.js";
import { api, apiConfig, normalizeShops } from "./lib/api.js";
import { copyText, uid } from "./lib/util.js";
import ThemeToggle from "./components/ThemeToggle.jsx";
// 路由級代碼分割：遊客掃碼只下載遊客端；商戶/管理端代碼按需加載
const MerchantStudio = lazy(() => import("./components/MerchantStudio.jsx"));
const AdminConsole = lazy(() => import("./components/AdminConsole.jsx"));

function Calçada({ dark = false }) {
  return (
    <div className={`calcada ${dark ? "calcada--dark" : ""}`} aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
    </div>
  );
}

function LanguageSwitcher({ lang, onChange, dark = false }) {
  return (
    <div className={`language-switcher ${dark ? "language-switcher--dark" : ""}`} aria-label="Language">
      <Languages size={15} aria-hidden="true" />
      {LANGS.map((item) => (
        <button
          className={lang === item.code ? "active" : ""}
          key={item.code}
          onClick={() => onChange(item.code)}
          title={item.label}
          type="button"
        >
          {item.short}
        </button>
      ))}
    </div>
  );
}

function Header({ lang, setLang, view, go, isLive }) {
  const t = getCopy(lang);
  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" onClick={() => go({ name: "home" })} type="button" aria-label="澳味智譯 home">
          <span className="brand-mark">味</span>
          <span>
            <b>澳味智譯</b>
            <small>TASTEWISE · MACAO</small>
          </span>
        </button>
        <nav className="primary-nav" aria-label="Primary navigation">
          <button className={view.name === "home" || view.name === "shop" ? "active" : ""} onClick={() => go({ name: "home" })} type="button">
            {t.navExplore}
          </button>
          <button className={view.name === "merchant" ? "active" : ""} onClick={() => go({ name: "merchant" })} type="button">
            {t.navMerchant}
          </button>
        </nav>
        <div className="header-tools">
          <span className={`source-dot ${isLive ? "live" : ""}`} title={isLive ? t.sourceLive : t.sourceDemo} />
          <ThemeToggle />
          <LanguageSwitcher lang={lang} onChange={setLang} />
        </div>
      </div>
    </header>
  );
}

function ShopArt({ shop, compact = false }) {
  const featured = shop.dishes?.find((dish) => dish.id === shop.featured) || shop.dishes?.[0];
  return (
    <div className={`shop-art shop-art--${shop.accent || "clay"} ${compact ? "shop-art--compact" : ""}`}>
      <span className="art-stamp">{shop.monogram || "味"}</span>
      <div className="art-orbit art-orbit--one" />
      <div className="art-orbit art-orbit--two" />
      {featured ? (
        <div className="art-label">
          <small>{featured.featured ? "HOUSE PICK" : "LOCAL TABLE"}</small>
          <strong>{localize(featured.name, "zh")}</strong>
        </div>
      ) : null}
    </div>
  );
}

const STEP_ICONS = [QrCode, Languages, MessageCircle];

function Home({ shops, lang, openShop, onMerchant, loading, error, onRetry }) {
  const t = getCopy(lang);
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("all");
  const districts = useMemo(() => {
    const values = shops.map((shop) => shop.district?.zh || localize(shop.district, lang)).filter(Boolean);
    return [...new Set(values)];
  }, [shops, lang]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return shops.filter((shop) => {
      const districtKey = shop.district?.zh || localize(shop.district, lang);
      const districtMatch = district === "all" || districtKey === district;
      const haystack = [
        localize(shop.name, lang), localize(shop.name, "zh"), localize(shop.name, "en"),
        localize(shop.type, lang), localize(shop.district, lang),
        ...(shop.dishes || []).flatMap((dish) => [localize(dish.name, lang), localize(dish.name, "zh"), localize(dish.name, "en")]),
      ].join(" ").toLocaleLowerCase();
      return districtMatch && (!needle || haystack.includes(needle));
    });
  }, [shops, query, district, lang]);

  return (
    <main>
      <section className="hero">
        <div className="hero-grid page-shell">
          <div className="hero-copy">
            <div className="eyebrow"><span />{t.eyebrow}</div>
            <h1>{t.heroTitleA}<em>{t.heroTitleB}</em></h1>
            <p>{t.heroText}</p>
            <label className="hero-search">
              <Search size={19} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
              {query ? <button onClick={() => setQuery("")} type="button" aria-label="Clear"><X size={16} /></button> : null}
            </label>
            <div className="district-row" aria-label="District filter">
              <button className={district === "all" ? "active" : ""} onClick={() => setDistrict("all")} type="button">{t.allDistricts}</button>
              {districts.map((item) => (
                <button className={district === item ? "active" : ""} onClick={() => setDistrict(item)} type="button" key={item}>
                  {localize(shops.find((shop) => (shop.district?.zh || localize(shop.district, lang)) === item)?.district, lang) || item}
                </button>
              ))}
            </div>
          </div>
          <div className="hero-menu" aria-label={t.featured}>
            <div className="hero-sign"><span>澳</span><span>味</span><span>智</span><span>譯</span></div>
            <div className="menu-paper">
              <div className="paper-head">
                <span>{t.featured}</span><Sparkles size={15} />
              </div>
              {shops.slice(0, 3).map((shop, index) => {
                const dish = shop.dishes?.find((item) => item.id === shop.featured) || shop.dishes?.[0];
                return dish ? (
                  <button className="paper-row" key={dish.id} onClick={() => openShop(shop)} type="button">
                    <span className="paper-index">0{index + 1}</span>
                    <span><strong>{localize(dish.name, lang)}</strong><small>{localize(shop.name, lang)}</small></span>
                    <b>MOP {dish.price}</b>
                  </button>
                ) : null;
              })}
            </div>
          </div>
        </div>
        <Calçada dark />
      </section>

      <section className="steps-strip">
        <div className="page-shell">
          <div className="steps-heading">
            <span className="section-kicker">HOW IT WORKS</span>
            <h2>{t.stepsTitle}</h2>
          </div>
          <div className="steps-grid">
            {(t.steps || []).map(([title, text], index) => {
              const Icon = STEP_ICONS[index] || QrCode;
              return (
                <div className="step-item" key={title}>
                  <span className="step-icon"><Icon size={20} /></span>
                  <span className="step-no">0{index + 1}</span>
                  <div><strong>{title}</strong><p>{text}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="explore-section page-shell">
        <div className="section-heading">
          <div><span className="section-kicker">CURATED IN MACAO</span><h2>{t.explore}</h2></div>
          <span className="result-count">{visible.length} {t.shopsFound}</span>
        </div>
        {loading ? (
          <div className="shop-grid" aria-busy="true" aria-label="正在讀取店舖資料">
            {[0, 1, 2].map((key) => <ShopCardSkeleton key={key} />)}
          </div>
        ) : error ? (
          <div className="empty-state error-state"><AlertCircle size={26} /><p>{error}</p><button onClick={onRetry} type="button">{t.retry}</button></div>
        ) : visible.length ? (
          <div className="shop-grid">
            {visible.map((shop, index) => (
              <div className="reveal" style={{ animationDelay: `${Math.min(index, 5) * 55}ms` }} key={shop.id}>
                <ShopCard shop={shop} lang={lang} onOpen={() => openShop(shop)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state"><Search size={26} /><p>{t.noResult}</p></div>
        )}
      </section>

      <section className="merchant-cta">
        <div className="page-shell merchant-cta-inner">
          <div>
            <span className="section-kicker">FOR SHOP OWNERS</span>
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaText}</p>
          </div>
          <button onClick={onMerchant} type="button">{t.ctaButton}<ArrowRight size={17} /></button>
        </div>
        <Calçada dark />
      </section>
    </main>
  );
}

function ShopCardSkeleton() {
  return (
    <div className="shop-card shop-card--skeleton" aria-hidden="true">
      <div className="skeleton-art" />
      <div className="shop-card-body">
        <div className="skeleton-line" style={{ width: "30%", height: 9 }} />
        <div className="skeleton-line" style={{ width: "68%", height: 19, marginTop: 15 }} />
        <div className="skeleton-line" style={{ width: "45%", height: 9 }} />
        <div className="skeleton-line" style={{ width: "100%", height: 1, marginTop: 22 }} />
      </div>
    </div>
  );
}

function ShopCard({ shop, lang, onOpen }) {
  const t = getCopy(lang);
  return (
    <article className="shop-card">
      <button className="shop-card-hit" onClick={onOpen} type="button" aria-label={`${t.viewShop}: ${localize(shop.name, lang)}`} />
      <ShopArt shop={shop} />
      <div className="shop-card-body">
        <div className="shop-card-topline">
          <span className="open-pill"><i />{t.open}</span>
          <span><Star size={13} fill="currentColor" /> {shop.rating}</span>
        </div>
        <h3>{localize(shop.name, lang)}</h3>
        <p className="shop-en-name">{localize(shop.name, "en")}</p>
        <div className="shop-meta"><MapPin size={14} />{localize(shop.district, lang)}<span>·</span>{shop.priceLevel}</div>
        <div className="shop-card-footer">
          <span>{localize(shop.type, lang)}</span>
          <span className="round-arrow"><ArrowRight size={16} /></span>
        </div>
      </div>
    </article>
  );
}

function ShopView({ shop, lang, setLang, go }) {
  const t = getCopy(lang);
  const [tab, setTab] = useState("menu");
  const [dish, setDish] = useState(null);
  const publicationStatus = shop.publication_status || shop.review_status;

  if (["unpublished", "pending", "in_review", "rejected"].includes(publicationStatus)) {
    const statusText = publicationStatus === "rejected" ? "此菜單正在修改中" : publicationStatus === "unpublished" ? "此菜單尚未發布" : "此菜單正在審核中";
    return <main className="unavailable-page"><button className="back-link dark" onClick={() => go({ name: "home" })} type="button"><ChevronLeft size={17} />{t.back}</button><div><Store size={34} /><span>MENU STATUS</span><h1>{statusText}</h1><p>店主更新完成並通過平臺檢查後，菜單會在原有連結自動上線。</p></div></main>;
  }

  return (
    <main className="shop-page">
      <section className={`shop-hero shop-hero--${shop.accent || "clay"}`}>
        <div className="page-shell shop-hero-inner">
          <button className="back-link" onClick={() => go({ name: "home" })} type="button"><ChevronLeft size={17} />{t.back}</button>
          <LanguageSwitcher lang={lang} onChange={setLang} dark />
          <div className="shop-identity">
            <div>
              <span className="shop-type-line">{localize(shop.type, lang)}</span>
              <h1>{localize(shop.name, lang)}</h1>
              <p>{localize(shop.name, "en")}</p>
              <div className="identity-meta"><MapPin size={14} />{localize(shop.district, lang)}<span>·</span><Star size={13} fill="currentColor" />{shop.rating}{shop.hours ? <><span>·</span><Clock3 size={13} />{shop.hours}</> : null}</div>
            </div>
            <div className="vertical-sign">{[...(localize(shop.name, "zh") || "小店")].slice(0, 5).map((ch, i) => <span key={`${ch}-${i}`}>{ch}</span>)}</div>
          </div>
        </div>
        <Calçada dark />
      </section>
      <div className="shop-tabs-wrap">
        <div className="shop-tabs page-shell" role="tablist">
          {[
            ["menu", t.tabMenu, UtensilsCrossed],
            ["ask", t.tabAsk, MessageCircle],
            ["story", t.tabStory, BookOpen],
            ["faq", t.tabFaq, ShieldCheck],
          ].map(([key, label, Icon]) => (
            <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)} type="button" role="tab" aria-selected={tab === key}>
              <Icon size={16} />{label}
            </button>
          ))}
        </div>
      </div>
      <div className="page-shell shop-content">
        {tab === "menu" ? <MenuTab shop={shop} lang={lang} onDish={setDish} /> : null}
        {tab === "ask" ? <AskTab shop={shop} lang={lang} onDish={setDish} /> : null}
        {tab === "story" ? <StoryTab shop={shop} lang={lang} /> : null}
        {tab === "faq" ? <FaqTab shop={shop} lang={lang} onAsk={() => setTab("ask")} /> : null}
      </div>
      {dish ? <DishDialog dish={dish} shop={shop} lang={lang} onClose={() => setDish(null)} /> : null}
    </main>
  );
}

function MenuTab({ shop, lang, onDish }) {
  const t = getCopy(lang);
  const [category, setCategory] = useState("all");
  const [filters, setFilters] = useState({ noPork: false, veg: false, noNuts: false, noSeafood: false, budget: false, gift: false });
  const dishes = shop.dishes || [];
  const featured = dishes.find((dish) => dish.id === shop.featured) || dishes.find((dish) => dish.featured) || dishes[0];
  const filterLabels = {
    zh: { noPork: "不喫豬肉", veg: "素食", noNuts: "堅果過敏", noSeafood: "海鮮過敏", budget: "≤ 50 MOP", gift: "適合送禮" },
    en: { noPork: "No pork", veg: "Vegetarian", noNuts: "Nut allergy", noSeafood: "Seafood allergy", budget: "≤ 50 MOP", gift: "Gifts" },
    pt: { noPork: "Sem porco", veg: "Vegetariano", noNuts: "Sem frutos secos", noSeafood: "Sem marisco", budget: "≤ 50 MOP", gift: "Lembranças" },
    ja: { noPork: "豚肉なし", veg: "ベジタリアン", noNuts: "ナッツなし", noSeafood: "魚介なし", budget: "≤ 50 MOP", gift: "お土産" },
  }[lang] || {};
  const visible = dishes.filter((dish) => {
    if (category !== "all" && dish.category !== category) return false;
    const text = `${(dish.tags || []).join(" ")} ${(dish.ingredients || []).join(" ")}`.toLocaleLowerCase();
    const allergens = dish.allergens || dish.alg || {};
    if (filters.noPork && (allergens.pork || /(?:^|\s)含豬肉|contains pork|contém porco|豚肉入り/.test(text))) return false;
    if (filters.veg && !(dish.vegetarian || allergens.vegetarian || /素食|純素|vegetarian|vegan|ベジ/.test(text))) return false;
    if (filters.noNuts && (allergens.nuts || allergens.nut || /堅果|花生|杏仁|nuts|amendoim|ナッツ/.test(text))) return false;
    if (filters.noSeafood && (allergens.seafood || /海鮮|蝦|蟹|魚|seafood|marisco|魚介/.test(text))) return false;
    if (filters.budget && Number(dish.price) > 50) return false;
    if (filters.gift && !(dish.category === "gift" || /送禮|gift|lembrança|お土産/.test(text))) return false;
    return true;
  });
  const availableCategories = CATEGORIES.filter((item) => item.id === "all" || dishes.some((dish) => dish.category === item.id));
  return (
    <div className="menu-layout">
      {featured ? (
        <button className={`featured-dish featured-dish--${shop.accent || "clay"}`} onClick={() => onDish(featured)} type="button">
          <div className="featured-copy">
            <span><Sparkles size={14} />{t.signature}</span>
            <h2>{localize(featured.name, lang)}</h2>
            <p>{localize(featured.desc, lang)}</p>
            <b>MOP {featured.price}</b>
          </div>
          <div className="dish-seal">{featured.symbol || shop.monogram}</div>
          <ArrowRight className="featured-arrow" size={20} />
        </button>
      ) : null}
      <div className="category-scroller">
        {availableCategories.map((item) => (
          <button className={category === item.id ? "active" : ""} onClick={() => setCategory(item.id)} key={item.id} type="button">
            {item[lang] || item.en}
          </button>
        ))}
      </div>
      <div className="menu-filter-row" aria-label="Dietary filters">
        {Object.keys(filters).map((key) => <button className={filters[key] ? "active" : ""} onClick={() => setFilters((old) => ({ ...old, [key]: !old[key] }))} type="button" key={key}><CheckCircle2 size={13} />{filterLabels[key]}</button>)}
      </div>
      <div className="dish-grid">
        {visible.map((item) => <DishCard dish={item} lang={lang} onClick={() => onDish(item)} key={item.id} />)}
      </div>
    </div>
  );
}

function DishCard({ dish, lang, onClick }) {
  const t = getCopy(lang);
  return (
    <button className={`dish-card ${dish.soldout ? "dish-card--soldout" : ""}`} onClick={onClick} type="button">
      <div className="dish-card-mark">{dish.symbol || "味"}</div>
      <div className="dish-card-copy">
        <div><h3>{localize(dish.name, lang)}</h3><b>MOP {dish.price}</b></div>
        <p>{localize(dish.desc, lang)}</p>
        <div className="tag-row">{dish.soldout ? <span className="soldout-tag">售罄</span> : null}{(dish.tags || []).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
      </div>
      <span className="details-link">{t.details}<ArrowRight size={13} /></span>
    </button>
  );
}

function DishDialog({ dish, shop, lang, onClose }) {
  const t = getCopy(lang);
  const [staffMode, setStaffMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef(null);
  useEffect(() => {
    // ESC 關閉 + Tab 焦點圈禁在彈窗內；關閉時焦點歸還觸發元素
    const previous = document.activeElement;
    const onKey = (event) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll("button, [href], input, select, textarea");
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector("button")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dish-dialog" role="dialog" aria-modal="true" aria-label={localize(dish.name, lang)} ref={dialogRef}>
        <button className="dialog-close" onClick={onClose} type="button" aria-label={t.close}><X size={19} /></button>
        {staffMode ? (
          <div className="staff-card">
            <span>{localize(shop.name, "zh")}</span>
            <div className="staff-symbol">{dish.symbol || shop.monogram}</div>
            <h2>{localize(dish.name, "zh")}</h2>
            <p>{localize(dish.name, lang)}</p>
            <strong>MOP {dish.price}</strong>
            <button onClick={() => setStaffMode(false)} type="button">{t.details}</button>
          </div>
        ) : (
          <>
            <div className={`dialog-art dialog-art--${shop.accent || "clay"}`}><span>{dish.symbol || shop.monogram}</span></div>
            <div className="dialog-body">
              <span className="dialog-shop">{localize(shop.name, lang)}</span>
              <div className="dialog-title"><h2>{localize(dish.name, lang)}</h2><strong>MOP {dish.price}</strong></div>
              <p className="dialog-desc">{localize(dish.desc, lang)}</p>
              <div className="dialog-languages">{LANGS.filter((item) => item.code !== lang).map((item) => <div key={item.code}><span>{item.short}</span><strong>{localize(dish.name, item.code) || "—"}</strong></div>)}</div>
              <div className="tag-row tag-row--large">{(dish.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <div className="ingredient-box">
                <span>{t.ingredients}</span>
                <p>{(dish.ingredients || []).join(" · ") || "—"}</p>
              </div>
              {dish.recommendation_reason || dish.recWhy ? <div className="detail-note"><span>{t.signature}</span><p>{localize(dish.recommendation_reason || dish.recWhy, lang)}</p></div> : null}
              {dish.owner_note || dish.ownerNote ? <div className="detail-note"><span>OWNER NOTE</span><p>{localize(dish.owner_note || dish.ownerNote, lang)}</p></div> : null}
              <div className="safe-note"><ShieldCheck size={17} /><span>{t.allergyNote}</span></div>
              <div className="dialog-actions"><button className="secondary-button" onClick={async () => { const ok = await copyText(`${localize(dish.name, "zh")} · MOP ${dish.price}`); if (ok) { setCopied(true); window.setTimeout(() => setCopied(false), 1400); } }} type="button"><Copy size={15} />{copied ? "已複製" : "複製菜名"}</button><button className="primary-button" onClick={() => setStaffMode(true)} type="button">{t.showStaff}<ArrowRight size={16} /></button></div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function fallbackAnswer(shop, query, lang) {
  const q = query.toLocaleLowerCase();
  const dishes = shop.dishes || [];
  const noPork = dishes.filter((dish) => !(dish.tags || []).some((tag) => /^(含豬肉|Pork)$/i.test(tag)));
  const under50 = dishes.filter((dish) => Number(dish.price) <= 50);
  const names = (items) => items.slice(0, 3).map((dish) => `${localize(dish.name, lang)} (MOP ${dish.price})`).join("、");
  const featured = dishes.find((dish) => dish.featured) || dishes[0];
  const porkQuery = /pork|porco|豬|豚/.test(q);
  const payQuery = /pay|payment|alipay|支付|付款|支払|pagamento/.test(q);
  const budgetQuery = /50|budget|預算|以內|menos|até/.test(q);
  if (lang === "en") {
    if (porkQuery) return `Pork-free options include ${names(noPork)}. Please confirm strict dietary needs with the staff.`;
    if (payQuery) return `The shop accepts ${(shop.payments || []).join(", ")}. Please follow the payment counter's latest notice.`;
    if (budgetQuery) return `Under MOP 50, you could choose ${names(under50)}.`;
    return `The owner's pick is ${localize(featured?.name, lang)} at MOP ${featured?.price}. ${localize(featured?.desc, lang)}`;
  }
  if (lang === "pt") {
    if (porkQuery) return `Opções sem porco: ${names(noPork)}. Para restrições rigorosas, confirme com o pessoal.`;
    if (payQuery) return `A loja aceita ${(shop.payments || []).join(", ")}. Confirme no balcão.`;
    if (budgetQuery) return `Até 50 MOP pode escolher ${names(under50)}.`;
    return `A sugestão da casa é ${localize(featured?.name, lang)}, MOP ${featured?.price}. ${localize(featured?.desc, lang)}`;
  }
  if (lang === "ja") {
    if (porkQuery) return `豚肉なしの候補は ${names(noPork)} です。厳格な制限はスタッフにご確認ください。`;
    if (payQuery) return `支払い方法：${(shop.payments || []).join("、")}。店頭の最新案內をご確認ください。`;
    if (budgetQuery) return `50 MOP以內なら ${names(under50)} があります。`;
    return `店主のおすすめは ${localize(featured?.name, lang)}（MOP ${featured?.price}）です。${localize(featured?.desc, lang)}`;
  }
  if (porkQuery) return `不含豬肉的選擇有：${names(noPork)}。如屬嚴格忌口，落單前請再向店員確認。`;
  if (payQuery) return `本店接受 ${(shop.payments || []).join("、")}。實際以收銀臺最新告示為準。`;
  if (budgetQuery) return `50 MOP 以內可選：${names(under50)}。`;
  return `店主推介 ${localize(featured?.name, lang)}，MOP ${featured?.price}。${localize(featured?.desc, lang)}`;
}

function AskTab({ shop, lang, onDish }) {
  const t = getCopy(lang);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const latestRef = useRef(null);

  const vote = async (index, helpful) => {
    const target = messages[index];
    setMessages((old) => old.map((message, i) => i === index ? { ...message, voted: helpful } : message));
    if (apiConfig.configured && target?.id) {
      try { await api.submitFeedback({ shopId: shop.id, messageId: target.id, helpful }); }
      catch { setMessages((old) => old.map((message, i) => i === index ? { ...message, voted: undefined } : message)); }
    }
  };

  const submit = async (question = input) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setMessages((old) => [...old, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      let answer;
      let related = [];
      if (apiConfig.configured) {
        const result = await api.askShop(shop.id, trimmed, lang);
        answer = result.answer || result.message || result.text;
        const ids = result.related_dish_ids || result.related || [];
        related = (shop.dishes || []).filter((dish) => ids.includes(dish.id));
        setMessages((old) => [...old, { role: "assistant", id: result.message_id || result.id, text: answer, related, risk: result.risk, requiresConfirmation: result.requires_confirmation }]);
        return;
      }
      if (!answer) {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        answer = fallbackAnswer(shop, trimmed, lang);
        related = (shop.dishes || []).slice(0, 2);
      }
      setMessages((old) => [...old, { role: "assistant", id: uid(), text: answer, related }]);
    } catch (error) {
      setMessages((old) => [...old, { role: "assistant", text: `${error.message}. ${t.retry}`, error: true }]);
    } finally {
      setLoading(false);
      window.setTimeout(() => latestRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
    }
  };

  return (
    <div className="ask-layout">
      <div className="ask-intro">
        <div className="ask-icon"><MessageCircle size={23} /></div>
        <div><h2>{t.askTitle}</h2><p>{t.askText}</p></div>
        <span><ShieldCheck size={14} />{t.confirmed}</span>
      </div>
      <div className="chat-window">
        {!messages.length ? (
          <div className="quick-grid">
            {t.quick.map((question) => <button key={question} onClick={() => submit(question)} type="button">{question}<ArrowRight size={14} /></button>)}
          </div>
        ) : (
          <div className="messages">
            {messages.map((message, index) => (
              <div className={`message message--${message.role} ${message.error ? "message--error" : ""}`} key={`${message.role}-${index}`}>
                <p>{message.text}</p>
                {message.role === "assistant" && !message.error ? <small><BadgeCheck size={13} />{t.confirmed}</small> : null}
                {message.requiresConfirmation || message.risk === "high" ? <div className="risk-answer"><AlertCircle size={14} />重要資料請向店員或官方渠道確認。</div> : null}
                {message.related?.length ? (
                  <div className="related-row">
                    {message.related.map((dish) => <button key={dish.id} onClick={() => onDish(dish)} type="button">{localize(dish.name, lang)}<span>MOP {dish.price}</span></button>)}
                  </div>
                ) : null}
                {message.role === "assistant" && !message.error ? <div className="answer-feedback">{message.voted === undefined ? <><span>這個回答有幫助嗎？</span><button onClick={() => vote(index, true)} type="button">有幫助</button><button onClick={() => vote(index, false)} type="button">沒幫助</button></> : <span><CheckCircle2 size={13} />已收到你的意見</span>}</div> : null}
              </div>
            ))}
            {loading ? <div className="message message--assistant message--loading"><Loader2 className="spin" size={16} />{t.thinking}</div> : null}
            <div ref={latestRef} />
          </div>
        )}
        <form className="chat-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={t.askPlaceholder} />
          <button disabled={!input.trim() || loading} type="submit" aria-label={t.send}>{loading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}</button>
        </form>
      </div>
    </div>
  );
}

function StoryTab({ shop, lang }) {
  const t = getCopy(lang);
  return (
    <div className="story-layout">
      <article className="story-card">
        <span className="story-number">EST. LOCAL</span>
        <BookOpen size={22} />
        <h2>{t.tabStory}</h2>
        <p>{localize(shop.story, lang)}</p>
        <div className="story-signature">{localize(shop.name, "zh")}</div>
      </article>
      <aside className="visit-card">
        <span className="section-kicker">VISIT</span><h2>{t.info}</h2>
        <InfoRow icon={Clock3} label={t.hours} value={shop.hours} />
        <InfoRow icon={MapPin} label={t.address} value={shop.address} />
        <InfoRow icon={WalletCards} label={t.payment} value={(shop.payments || []).join(" · ")} />
        <button type="button"><Navigation size={16} />{localize(shop.district, lang)}</button>
      </aside>
    </div>
  );
}

function FaqTab({ shop, lang, onAsk }) {
  const [open, setOpen] = useState(0);
  const faqs = shop.faqs || shop.faq || [];
  const labels = {
    zh: ["常見問題", "沒有找到答案？直接問小店", "問一個問題"],
    en: ["Frequently asked questions", "Can't find an answer? Ask the shop", "Ask a question"],
    pt: ["Perguntas frequentes", "Não encontrou? Pergunte à loja", "Perguntar"],
    ja: ["よくある質問", "答えが見つからない場合はお店に質問", "質問する"],
  }[lang] || [];
  return <div className="faq-layout"><div className="faq-heading"><span className="section-kicker">SHOP KNOWLEDGE</span><h2>{labels[0]}</h2></div>{faqs.length ? <div className="faq-list">{faqs.map((faq, index) => { const question = localize(faq.question || faq.q, lang); const answer = localize(faq.answer || faq.a, lang); return <article className={open === index ? "open" : ""} key={faq.id || index}><button onClick={() => setOpen(open === index ? -1 : index)} type="button"><span>{String(index + 1).padStart(2, "0")}</span><strong>{question}</strong><ChevronRight size={17} /></button>{open === index ? <div><p>{answer}</p>{faq.requires_confirmation ? <small><ShieldCheck size={13} />請向店員或官方渠道再次確認。</small> : null}</div> : null}</article>; })}</div> : <div className="empty-state"><BookOpen size={24} /><p>店主尚未提供常見問題。</p></div>}<button className="faq-ask" onClick={onAsk} type="button"><MessageCircle size={17} /><span><strong>{labels[1]}</strong><small>{labels[2]}</small></span><ArrowRight size={16} /></button></div>;
}

function InfoRow({ icon: Icon, label, value }) {
  return <div className="info-row"><Icon size={17} /><span><small>{label}</small><strong>{value || "—"}</strong></span></div>;
}

function Footer({ lang, go }) {
  const t = getCopy(lang);
  return (
    <footer className="site-footer">
      <Calçada />
      <div className="page-shell footer-inner">
        <div className="footer-brand">
          <div><span className="brand-mark">味</span><b>{t.footer}</b></div>
          <p>{t.footerText}</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <span>{t.footerNav}</span>
          <button onClick={() => go({ name: "home" })} type="button">{t.navExplore}</button>
          <button onClick={() => go({ name: "merchant" })} type="button">{t.navMerchant}</button>
          <button onClick={() => go({ name: "admin" })} type="button">{t.navAdmin}</button>
        </nav>
        <small>MACAO · ZH / EN / PT / JA</small>
      </div>
    </footer>
  );
}

export default function App() {
  // 記住遊客的語言選擇（刷新/回訪不再跳回中文）；存儲值不合法時回退 zh
  const [lang, setLangState] = useState(() => {
    try {
      const stored = window.localStorage.getItem("aoweizhiyi_lang");
      return LANGS.some((item) => item.code === stored) ? stored : "zh";
    } catch { return "zh"; }
  });
  const setLang = (code) => {
    setLangState(code);
    try { window.localStorage.setItem("aoweizhiyi_lang", code); } catch { /* 私隱模式下靜默降級 */ }
  };
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const shopId = params.get("shop");
    if (shopId) return { name: "shop", id: shopId };
    if (params.get("page") === "merchant") return { name: "merchant" };
    return params.get("page") === "admin" ? { name: "admin" } : { name: "home" };
  });
  const [shops, setShops] = useState(() => apiConfig.configured ? [] : SAMPLE_SHOPS);
  const [isLive, setIsLive] = useState(false);
  const [shopLoad, setShopLoad] = useState({ loading: apiConfig.configured, error: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const [remoteShop, setRemoteShop] = useState(null);
  const [detailState, setDetailState] = useState({ loading: false, error: "" });

  useEffect(() => {
    let active = true;
    if (!apiConfig.configured) {
      setShops(SAMPLE_SHOPS);
      setShopLoad({ loading: false, error: "" });
      return () => { active = false; };
    }
    setShopLoad({ loading: true, error: "" });
    api.getShops(lang)
      .then((payload) => {
        const normalized = normalizeShops(payload);
        if (active) {
          setShops(normalized);
          setIsLive(true);
          setShopLoad({ loading: false, error: "" });
        }
      })
      .catch((error) => {
        if (active) {
          setShops([]);
          setIsLive(false);
          setShopLoad({ loading: false, error: error.message || "無法讀取店舖資料" });
        }
      });
    return () => { active = false; };
  }, [lang, reloadKey]);

  useEffect(() => {
    const syncRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const shopId = params.get("shop");
      setView(shopId ? { name: "shop", id: shopId } : params.get("page") === "merchant" ? { name: "merchant" } : params.get("page") === "admin" ? { name: "admin" } : { name: "home" });
    };
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    if (view.name !== "shop" || !apiConfig.configured || shops.some((shop) => shop.id === view.id)) return;
    let activeRequest = true;
    setDetailState({ loading: true, error: "" });
    api.getShop(view.id, lang).then((payload) => {
      if (!activeRequest) return;
      const normalized = normalizeShops([payload])[0];
      setRemoteShop(normalized || null);
      setDetailState({ loading: false, error: normalized ? "" : "店舖不存在" });
    }).catch((error) => { if (activeRequest) setDetailState({ loading: false, error: error.message }); });
    return () => { activeRequest = false; };
  }, [view, shops, lang]);

  const go = (next) => {
    setView(next);
    const url = next.name === "shop" ? `/?shop=${encodeURIComponent(next.id)}` : next.name === "merchant" ? "/?page=merchant" : next.name === "admin" ? "/?page=admin" : "/";
    window.history.pushState({}, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const selectedShop = view.name === "shop" ? shops.find((shop) => shop.id === view.id) || (remoteShop?.id === view.id ? remoteShop : null) : null;

  return (
    <div className="app-shell">
      {view.name !== "merchant" && view.name !== "admin" ? <Header lang={lang} setLang={setLang} view={view} go={go} isLive={isLive} /> : null}
      {view.name === "home" ? <Home shops={shops} lang={lang} openShop={(shop) => go({ name: "shop", id: shop.id })} onMerchant={() => go({ name: "merchant" })} loading={shopLoad.loading} error={shopLoad.error} onRetry={() => setReloadKey((value) => value + 1)} /> : null}
      {view.name === "shop" && selectedShop ? <ShopView shop={selectedShop} lang={lang} setLang={setLang} go={go} /> : null}
      {view.name === "shop" && !selectedShop ? <main className="shop-detail-state">{detailState.loading ? <><Loader2 className="spin" /><p>正在讀取店舖菜單…</p></> : <><AlertCircle /><p>{detailState.error || "找不到此店舖"}</p><button onClick={() => go({ name: "home" })} type="button">返回首頁</button></>}</main> : null}
      <Suspense fallback={view.name === "merchant" || view.name === "admin" ? <main className="shop-detail-state"><Loader2 className="spin" /><p>正在載入工作臺…</p></main> : null}>
        {view.name === "merchant" ? <MerchantStudio lang={lang} onPreview={(id) => go({ name: "shop", id })} /> : null}
        {view.name === "admin" ? <AdminConsole /> : null}
      </Suspense>
      {view.name !== "merchant" && view.name !== "admin" ? <Footer lang={lang} go={go} /> : null}
    </div>
  );
}

