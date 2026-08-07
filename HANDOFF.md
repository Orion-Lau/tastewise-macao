# 澳味智譯 · AI 開發交接說明

## 快速啓動

```bash
pnpm install   # 或 npm install（依賴版本已在 package.json 釘住）
pnpm dev       # 或 npm run dev
```

默認地址：`http://localhost:4173`

> 本機沒有全局 Node 時可用便攜版：`D:\tools\node\node.exe`（v22.14.0，含 npm）。
> 國內網絡建議加 `--registry=https://registry.npmmirror.com`。

## 頁面入口

- 遊客端：`/`
- 店鋪深鏈接：`/?shop=<shopId>`
- 商戶端：`/?page=merchant`
- 管理員端：`/?page=admin`

## 關鍵文件

- `src/App.jsx`：遊客端、路由和公共頁面
- `src/components/MerchantStudio.jsx`：商戶完整工作臺
- `src/components/AdminConsole.jsx`：平臺審覈後臺
- `src/lib/api.js`：所有真實 API 調用
- `src/data.js`：僅在未配置 API 時使用的離線演示數據
- `src/i18n.js`：中、英、葡、日界面文案
- `API_CONTRACT.md`：後端接口及響應字段契約
- `server/lib/llm.js`：QwenPaw 平臺適配層（全項目唯一平臺耦合點；環境變量清單見 `.env.example` 的 QWENPAW_*）

## 數據模式

設置 `VITE_API_BASE_URL` 後進入正式 API 模式。正式模式不會靜默回退到樣例數據；接口失敗會在頁面顯示錯誤。

未設置 API 時進入明確標註的離線演示模式，用於前端界面和交互驗收。

## 修改原則

- 品牌名稱固定爲“澳味智譯”。
- 保留 LocalBridge 的墨青、福隆紅、紙白和澳門舊城視覺語言。
- 不恢復賽事、參賽數據或面向用戶的 Agent 架構宣傳。
- 過敏原、忌口、醫療、海關及法律信息不得由前端或 Agent 猜測。
- 管理員權限必須由服務端校驗，不能只依靠前端路由隱藏。
- 審覈期間線上菜單與草稿必須版本隔離。

## 2026-07-06 第十一輪：QwenPaw live 架構落地（llm.js / agent 雙態 / eval:live）

- **納入 git**：本輪起項目有版本控制（首個提交 `bb78485` 爲第十輪完成後的基線快照）。此前十輪歷史僅存於本文件。
- **`server/config.js` + `server/lib/llm.js`（新增）**：平臺耦合全部收斂在 llm.js 一個文件——默認按 OpenAI 兼容形態實現（智能體 ID 放 model 字段），拿到平臺 API 文檔後只需改 `buildRequest` / `extractText` 兩個函數。config 只讀 `QWENPAW_*` 環境變量，無 key 即 `enabled: false`。`parseAgentJson` 統一剝 markdown 圍欄再解析。
- **5 個 agent 接入 live 路徑**（assistant / translator / marketing / faq-generator / onboarding）：模塊內拆爲 `buildPrompt`（按 prompts/*.md 用戶消息格式拼 JSON）→ `llm.invoke` → `validate`（紅線後校驗）；原 mock 改名 `runLocal` 保留；平臺失敗或輸出違規自動降級並帶 `degraded: true`。menu-extractor（待視覺能力）與 risk-checker（安全裁定，架構決策）保持純代碼。
- **validate 紅線清單**：assistant——拒答類無論模型答什麼一律替換拒答模板、忌口強制二次確認、related_dish_ids 只認注入菜單裏真實存在且通過忌口過濾的 id；translator——條目與輸入一一對應、已有譯文不覆蓋、漏譯回退佔位草稿、永遠 status=draft；marketing——正文/標題命中具體折扣承諾直接判違規降級、brief 提優惠必落「以店內公示為準」+ warning、tags 過濾到真實字段；faq——id 代碼層生成、忌口類強制二次確認；onboarding——無可信價格的條目剔除（不編價格）、allergens 強制空對象、confirmed=false、永遠草稿。
- **關鍵設計：`run()` 雙態簽名**——`agents.test.mjs` 同步調用 `run()`，按計劃一行未動；因此 run 不聲明 async：mock 路徑同步返回，live 路徑返回 Promise，`index.js` 統一 `await`（對兩態都成立）。
- **`server/eval-live.test.mjs`（新增，7 條）**：與 mock 紅線同源的斷言打真平臺，額外斷言 `degraded !== true`（平臺失敗被靜默降級時必須紅，逼出調優）；未配置 key 整組跳過。
- **腳本**：`npm run eval:live` 新增；`server` / `agent` 腳本加 `--env-file-if-exists=.env` 自動讀環境變量；`npm run agent -- <name> '<json>' --live` 單智能體打真平臺（調試截圖用）。
- **配套**：`.env.example` 增 QWENPAW_* 清單；`docs/qwenpaw-log.md` 調優日誌表就位；AGENTS.md 契約更新爲 `run(input, { llm }?)` 並新增「Live 模式與降級」一節。
- **已驗證**：`npm test` 9/9（測試文件未動）；eval:live 未配 key 時 7 條幹淨跳過；CLI mock 輸出正確、`--live` 缺 key 明確報錯退出 1；HTTP 全鏈路——起服務後忌口提問返回 dietary+二次確認+豬肉菜被過濾、海關提問返回 forbidden+high+拒答模板、啓動日誌正確顯示當前模式。（注意：Windows 下用 curl 命令行直髮中文會被 shell 編碼弄亂、意圖全落 recommendation，聯調請用 `--data-binary @file.json` 發 UTF-8 文件體。）
- **待辦**（依賴平臺材料）：拿到 QwenPaw API 文檔後適配 llm.js 兩個函數；平臺建好智能體、填好 `.env` 後跑通 `npm run eval:live` 並開始記調優日誌。

## 2026-07-04 第十輪：QwenPaw 參賽接入規劃與提示詞資產

- 新增 **QWENPAW_PLAN.md**：在不改前端與 API 契約的前提下把智能體層真實跑在 QwenPaw 上的實施方案——agent 內部改爲「有密鑰調平臺 / 無密鑰或失敗降級回 mock」；平臺耦合收斂在待建的 `server/lib/llm.js` 單文件；`eval:live` 複用現有 9 條紅線斷言作爲調優驗收；risk-checker 有意不接 LLM（安全裁定純代碼）。含材料映射與至 8/9 的排期。
- 新增 **prompts/** 目錄（7 個文件）：6 個智能體的系統提示詞（可直接粘貼 QwenPaw）+ 用戶消息格式 + 調優用例（與 agents.test.mjs 斷言對應），README 說明使用步驟、溫度建議、"裸 JSON 輸出"等通用約定。
- 待辦（依賴用戶提供平臺 API 文檔）：`server/lib/llm.js`、`server/config.js`、各 agent 的 async 化與 `validate()` 紅線後校驗、`eval-live.test.mjs`。

## 2026-07-03 第九輪：暗色主題「霓虹夜場」（規範 P3）

- **機制**：`index.html` 內聯腳本在首幀前按「localStorage(`aoweizhiyi_theme`) → 系統偏好」寫入 `<html data-theme>`（無閃爍）；CSS 僅一個 `[data-theme="dark"]` 令牌覆寫塊 + `color-scheme: dark`（原生控件/滾動條自動跟隨）；三端頂欄各有日/夜切換按鈕（共用組件 `src/components/ThemeToggle.jsx`），切換即存。
- **關鍵前置改造（59 處批量替換）**：全站「把 `--ink` 當深色背景/邊框」的表面改走**不翻轉**的 `--ink-solid`，墨青面板上的米白文字改走 `--cream`——否則令牌翻轉後 hero/CTA/頂欄這些深色面板會變白。夜場裏墨青面板（#20342f）疊在更深的頁面底（#151f1a）上形成層次。殘留硬編碼淺色（#f2eee4/#e9e2d2/#f1eee6/#fffdf8/#fffefb/背景 #fff 等）同步收編進令牌，淺色模式視覺零差異。
- **設計決策**：菜單紙與「給店員看」卡在夜場**保持米白**（局部令牌重設即可，內部規則原樣生效）——夜街上發光的紙菜單；QR 碼強制白底（掃碼可靠性）；深底上的福隆紅文字提亮爲 #e0806a（紅色背景不動，按鈕白字對比不受影響）；錯誤/警示/藍章三類淺色底徽章各配暗色檔。
- **已驗證**：切換→body #151f1a/文字米白/localStorage 持久化/刷新保持；菜單紙文字保持墨青 rgb(32,52,47)；店鋪頁價格紅提亮、吸頂欄深色毛玻璃、彈窗深卡色；商戶端 shell/側欄/頂欄/統計卡四層深色正確；管理端徽章暗金配色；375px 無溢出（切換按鈕 23px 擠壓檔）；往返切換正常；三端控制檯零報錯；`npm test` 9/9；構建通過。
- 注意：`.language-switcher--dark button.active` 的 border 在批量替換中連帶改爲 `--cream`（原爲 `--paper`），淺色下同值無差異，暗色下反而正確，屬良性連帶。

## 2026-07-03 第八輪：功能缺口修復 + 性能 + 測試

- **語言記憶**：遊客語言選擇存 localStorage（`aoweizhiyi_lang`），刷新/回訪不再跳回中文；存儲值不合法時回退 zh，私隱模式靜默降級。已驗證：切 EN → 刷新仍爲英文。
- **彈窗焦點圈禁**：菜品詳情彈窗 Tab/Shift+Tab 焦點在彈窗內迴繞，打開時聚焦彈窗內首個按鈕，關閉時焦點歸還觸發元素（ESC 原有）。已驗證：末尾 Tab 的 defaultPrevented=true 且迴繞到關閉按鈕。
- **路由級代碼分割**：MerchantStudio/AdminConsole 改 `React.lazy` + Suspense（fallback 複用 shop-detail-state 載入態）。遊客端主包 333.5KB→256.2KB（gzip 109→84.4KB），商戶端 68.8KB JS + 26.3KB CSS、管理端 11.1KB + 9KB 均變爲按需 chunk，CSS 隨 JS 自動拆分。
- **Agent 冒煙測試**：新增 `server/agents.test.mjs`（node:test，零依賴，9 條全過），斷言各 agent 的安全紅線：忌口過濾+強制確認、醫療/海關拒答 risk=high、識別結果全部待確認、壞行跳過並警告、翻譯未命中顯式草稿標記、忌口 FAQ 強制確認、折扣不逐字引用、風險旗標矛盾檢測。`npm test` 運行。
  - 坑：`node --test server`（目錄形式）會把 `server/index.js` 也當測試執行導致 EADDRINUSE，腳本必須精確指定測試文件。
- 管理端表格搜索在本輪開工前已由另一處修改實現（含 `.admin-table-empty` 空態），未重複改動。
- 未做（有意）：未知 `?page=` 值的 404 提示（價值低）；暗色主題需先補齊語義層令牌（見規範路線圖 P3）。

## 2026-07-03 第七輪：UI/UX 美化落地（按規範 P0 + 部分 P1/P2）

按 DESIGN_SYSTEM.md（已更名爲「澳味智譯·視覺與體驗規範 v1.1」，去掉概念化命名）執行，全部改動經瀏覽器逐項驗證、三端控制檯零報錯、375px 無溢出：

- **可讀性（P0）**：三份 CSS 中 8.5px 以下文本共 58 處提升（7→9.5 / 7.5→9.5 / 8→10 / 8.5→10.5）；唯一保留的 6px 是進度環裏的「%」純符號。
- **綠色歸一（P0）**：原先十餘種微差綠（#4f7459/#4d6c53/#557b5e/#66806a 等 44 處）收斂爲 `--moss-100/200/400/500/700/800` 六檔令牌，已入 `:root`。
- **金字對比（P0）**：紙面上做文字的 `--gold`（≈2.5:1）全部改 `--gold-700 #8a672a`（paper-index、story-number、店卡 topline、FAQ 序號、商戶端各序號列）；深底上的金不動。
- **章壓影純化（P0）**：`.step-icon` 的 rgba 陰影改實色 `var(--line)`（章壓語言禁 rgba）。
- **三端角色色（P2）**：主行動按鈕三端保持福隆紅；環境信號各歸其位——商戶端側欄選中金色高亮條 + kicker/進度環轉金（餅金＝賬房），管理端側欄藍色高亮條 + 頁頭 kicker 轉瓷磚藍（門牌＝公證），遊客端維持福隆紅。
- **動效（P2）**：新增「霓虹息」（在線圓點 2.4s glow 呼吸，僅授權 live 狀態點，每屏 ≤2 處）與「換場」（路由切換 main 240ms 淡入；main 僅在視圖切換時重掛載，語言切換不觸發）；返回鏈接箭頭 hover 左移、FAQ 提問卡 hover 上浮。全部掛入 `prefers-reduced-motion`。
- 批量替換腳本方式執行（44+12+58 處），構建通過（CSS 78.6KB）。剩餘工作見規範路線圖：其餘裸色歸倉、狀態徽章組件化、暗色主題。

## 2026-07-03 第六輪：設計系統規劃（DESIGN_SYSTEM.md）

- 新增 **DESIGN_SYSTEM.md（濠鏡設計系統 v1.0）**：不推翻現有 LocalBridge 視覺，走「系統化＋提純＋一筆科技光」路線。核心決策：三層色彩令牌（原色/語義/組件）；三端角色色（遊客紅/商戶金/平臺藍，僅作環境提示，主行動色三端統一福隆紅）；七級字階並強制 12px 正文下限（現存 7–9px 文本爲違例）；兩種陰影語言（章壓/浮紙）不得同體；「霓虹 glow 只給活物、每屏 ≤2 處」作爲唯一科技感語彙；狀態語義色統一（現存十種微差綠收斂爲 moss 三檔）。
- 文檔含**現狀審計**（違例清單精確到選擇器）與 **P0–P3 分期路線圖**（快贏→令牌化→組件精修→暗色夜場），每期有獨立驗收標準。本輪爲純規劃，未動樣式代碼；實施從 P0 開始按期推進。

## 2026-07-03 第五輪：視覺打磨

不改結構/功能，只做「精緻感」相關的小成本高回報改動：

- **Favicon**：內聯 SVG data URI（紅底「味」字，呼應 `.brand-mark` 印章樣式），無需額外資源文件。
- **全局質感**：`::selection` 改爲金色高亮；`html` 自定義細滾動條（金/紙色），替代系統默認灰色滾動條。
- **印章按壓反饋**：`.primary-button`、`.merchant-cta button`、`.ms-primary` 新增 `:active` 態——按下時陰影收平、位移到陰影原位，呼應整體的蓋章/貼紙視覺語言（新規則統一追加在各 CSS 文件末尾，源碼順序保證覆蓋已有的 `:hover` 位移）。
- **首頁骨架屏**：`loading` 態從純文字+spinner 換成 3 張與真實 `.shop-card` 同尺寸的骨架卡片（shimmer 掃光動畫），數據到達後不再有佈局跳動；同時刪除了只用過一次的舊 `.loading-state` 規則。
- **進場動效**：首頁「今日想喫」三行菜單、「三步」引導卡片、店鋪網格卡片新增淡入上浮動效（`@keyframes reveal`，按順序錯開延遲）；已加 `prefers-reduced-motion` 保護。店鋪網格卡片改爲在外層包一層 `.reveal` div 承載動效，不影響 `.shop-card` 本身的 hover 位移（兩者分離，避免 `animation: forwards` 與 `:hover transform` 搶佔同一屬性的經典坑）。
- **空狀態圖標**：`.empty-state`、`.shop-detail-state`、`.admin-empty` 的線框圖標統一加一層紙色圓底，不再孤零零漂浮。
- 驗證方式：本輪瀏覽器截圖工具在當前會話環境下持續超時（診斷爲預覽標籤頁 `document.visibilityState === "hidden"` 導致 Chromium 凍結動畫時間軸與合成幀，與代碼改動無關）；改用 `preview_eval` 做等價驗證——`getAnimations()` 強制 `finish()` 後確認動效終態正確（opacity:1、transform 歸位）、逐條覈對新增 CSS 規則已生效（`document.styleSheets` 檢索）、骨架屏尺寸與真實卡片一致、桌面/375px 移動端均無橫向溢出、首頁/店鋪頁/商戶登錄頁控制檯零報錯。真實前臺標籤頁中動效會正常播放。

## 2026-07-02 第四輪：Agent 架構顯性化 + 參考後端

- **AGENTS.md**：正式定義平臺的 7 個 Agent（接待問答/菜單識別/建檔/翻譯/FAQ 生成/營銷文案/風險檢查），含各自端點、輸入輸出、安全紅線與五條獨立性契約（純函數、數據注入、零橫向依賴、可單獨調用、失敗隔離）。
- **參考後端 `server/`**（零第三方依賴，`npm run server`，端口 8788）：實現 API_CONTRACT 全部端點。每個 Agent 一個獨立模塊（`server/agents/*.js`），互相不 import，數據由路由層注入；`npm run agent -- <name> '<json>'` 可脫離 HTTP 單獨調用任一 Agent。
- **已驗證**（正式 API 模式端到端）：遊客問答（忌口過濾+確認提示、醫療/海關拒答）、商戶登錄/翻譯/FAQ 生成/營銷（brief 提折扣不逐字引用）、提交審覈 → 管理員隊列風險標記 → 批准 → 遊客端菜單實時更新、商戶/管理員令牌互不通用、退回必填原因。
- 前端一行調整：`MerchantStudio` 狀態徽章改爲 `review_status` 優先（審覈中/被退回時商戶看到流程狀態，遊客端仍按 `publication_status` 顯示線上菜單，版本隔離不受影響）。
- 本地聯調：`npm run server` + `.env.local` 寫 `VITE_API_BASE_URL=http://localhost:8788`（vite 會自動重啓）。參考後端爲內存存儲，重啓即重置；登錄爲演示樁（任意賬號+非空密碼），正式環境必須替換。

## 2026-07-02 第三輪：頁面結構與視覺

- **移動端導航修復**：≤650px 時主導航原來 `display:none` 且無替代入口，手機用戶到不了商戶入口。現在導航常駐（品牌副標題在窄屏隱藏、語言按鈕收緊，375px 無橫向溢出）。
- **信息架構調整**：「平臺審覈」從遊客主導航降級到頁腳「快速入口」（內部功能不該佔遊客視線；路由 `/?page=admin` 不變）。頁腳重建爲品牌＋快速入口＋地區語言三段式。
- **首頁結構補全**：新增「三步，看懂一間小店」引導條（hero 與店鋪列表之間）與頁尾商戶轉化區（FOR SHOP OWNERS 深色 CTA 帶），文案已配齊中英葡日四語（i18n 新增 `steps`/`ctaTitle`/`ctaText`/`ctaButton`/`tabFaq`/`footerNav`）。
- **商戶端側邊欄分組**：11 個平鋪導航項改爲四組——營運概覽／菜單更新流程（01–05，與概覽頁步驟條一致）／店舖經營／增長工具。
- **視覺細節**：移動端豎招牌不再被視口裁切、也不遮菜價（菜單紙右側留出落位）；店鋪頁 hero 元信息補充營業時間；FAQ 標籤改走 i18n。
- 注意：新組件的響應式覆蓋規則集中在 styles.css 文件末尾（必須位於基礎規則之後，同優先級後者勝出）。

## 2026-07-02 第二輪修訂

- **分類契約對齊**：商戶端菜品分類此前以中文標籤（“主食”）作爲存儲值，與 API 契約及遊客端篩選用的穩定 id（`main`/`snack`/…）不一致，導致商戶流程發佈的菜單在遊客端分類失效。現統一存 id，中文僅作顯示；`normalizeCategory` 兼容舊的中文值。
- **非安全上下文兼容**（`src/lib/util.js`）：`crypto.randomUUID` 與 `navigator.clipboard` 在手機經局域網 `http://192.168.x.x` 訪問時不存在（dev 綁定 0.0.0.0 正是爲了真機測試）。之前新增菜品會直接崩潰、複製按鈕靜默失效；現統一走 `uid()` / `copyText()` 降級。
- **商戶與管理員令牌隔離**（`src/lib/api.js`）：分開 sessionStorage key，請求按 `/v1/admin` 前綴選 token；`hasSession`/`logout` 支持 scope。商戶登錄態不再被誤判爲管理員登錄態。
- **刪除死代碼**：`App.jsx` 中被 `MerchantStudio` 取代的舊 `Merchant` 組件（約 106 行）已移除。`i18n.js` 中 `merchantTitle` 等舊 key 暫保留（無引用、無害）。
- **依賴釘版本**：`package.json` 由全部 `latest` 改爲鎖定版本（react 19.2.7 / vite 8.1.2 等，與原 pnpm-lock 一致），vite 與 plugin 移入 devDependencies。
- 小修：切換語言不再把商戶工作臺重置到第一間店鋪；管理後臺表格搜索框可用（原爲裝飾）；QR 尚未生成時不再渲染空 `href` 的 PNG 下載鏈接。

## 當前驗證狀態

- `npm run build` 已通過（vite 8.1.3）。
- 遊客首頁、店鋪問答（demo 回答 + 反饋按鈕）已在瀏覽器驗證。
- 商戶示範工作臺：分類下拉存穩定 id、新增菜品、發佈面板真實 QR（PNG/SVG/複製鏈接）已驗證。
- 管理員示範後臺：登錄、遊客反饋表格搜索篩選已驗證。
- 以上均爲離線演示模式驗證；正式 API 模式的接口行爲未變（僅令牌選擇邏輯按 scope 拆分）。

