# 澳味智译 · AI 开发交接说明

## 快速启动

```bash
pnpm install   # 或 npm install（依赖版本已在 package.json 钉住）
pnpm dev       # 或 npm run dev
```

默认地址：`http://localhost:4173`

> 本机没有全局 Node 时可用便携版：`D:\tools\node\node.exe`（v22.14.0，含 npm）。
> 国内网络建议加 `--registry=https://registry.npmmirror.com`。

## 页面入口

- 游客端：`/`
- 店铺深链接：`/?shop=<shopId>`
- 商户端：`/?page=merchant`
- 管理员端：`/?page=admin`

## 关键文件

- `src/App.jsx`：游客端、路由和公共页面
- `src/components/MerchantStudio.jsx`：商户完整工作台
- `src/components/AdminConsole.jsx`：平台审核后台
- `src/lib/api.js`：所有真实 API 调用
- `src/data.js`：仅在未配置 API 时使用的离线演示数据
- `src/i18n.js`：中、英、葡、日界面文案
- `API_CONTRACT.md`：后端接口及响应字段契约
- `server/lib/llm.js`：QwenPaw 平台适配层（全项目唯一平台耦合点；环境变量清单见 `.env.example` 的 QWENPAW_*）

## 数据模式

设置 `VITE_API_BASE_URL` 后进入正式 API 模式。正式模式不会静默回退到样例数据；接口失败会在页面显示错误。

未设置 API 时进入明确标注的离线演示模式，用于前端界面和交互验收。

## 修改原则

- 品牌名称固定为“澳味智译”。
- 保留 LocalBridge 的墨青、福隆红、纸白和澳门旧城视觉语言。
- 不恢复赛事、参赛数据或面向用户的 Agent 架构宣传。
- 过敏原、忌口、医疗、海关及法律信息不得由前端或 Agent 猜测。
- 管理员权限必须由服务端校验，不能只依靠前端路由隐藏。
- 审核期间线上菜单与草稿必须版本隔离。

## 2026-07-06 第十一轮：QwenPaw live 架构落地（llm.js / agent 双态 / eval:live）

- **纳入 git**：本轮起项目有版本控制（首个提交 `bb78485` 为第十轮完成后的基线快照）。此前十轮历史仅存于本文件。
- **`server/config.js` + `server/lib/llm.js`（新增）**：平台耦合全部收敛在 llm.js 一个文件——默认按 OpenAI 兼容形态实现（智能体 ID 放 model 字段），拿到平台 API 文档后只需改 `buildRequest` / `extractText` 两个函数。config 只读 `QWENPAW_*` 环境变量，无 key 即 `enabled: false`。`parseAgentJson` 统一剥 markdown 围栏再解析。
- **5 个 agent 接入 live 路径**（assistant / translator / marketing / faq-generator / onboarding）：模块内拆为 `buildPrompt`（按 prompts/*.md 用户消息格式拼 JSON）→ `llm.invoke` → `validate`（红线后校验）；原 mock 改名 `runLocal` 保留；平台失败或输出违规自动降级并带 `degraded: true`。menu-extractor（待视觉能力）与 risk-checker（安全裁定，架构决策）保持纯代码。
- **validate 红线清单**：assistant——拒答类无论模型答什么一律替换拒答模板、忌口强制二次确认、related_dish_ids 只认注入菜单里真实存在且通过忌口过滤的 id；translator——条目与输入一一对应、已有译文不覆盖、漏译回退占位草稿、永远 status=draft；marketing——正文/标题命中具体折扣承诺直接判违规降级、brief 提优惠必落「以店內公示為準」+ warning、tags 过滤到真实字段；faq——id 代码层生成、忌口类强制二次确认；onboarding——无可信价格的条目剔除（不编价格）、allergens 强制空对象、confirmed=false、永远草稿。
- **关键设计：`run()` 双态签名**——`agents.test.mjs` 同步调用 `run()`，按计划一行未动；因此 run 不声明 async：mock 路径同步返回，live 路径返回 Promise，`index.js` 统一 `await`（对两态都成立）。
- **`server/eval-live.test.mjs`（新增，7 条）**：与 mock 红线同源的断言打真平台，额外断言 `degraded !== true`（平台失败被静默降级时必须红，逼出调优）；未配置 key 整组跳过。
- **脚本**：`npm run eval:live` 新增；`server` / `agent` 脚本加 `--env-file-if-exists=.env` 自动读环境变量；`npm run agent -- <name> '<json>' --live` 单智能体打真平台（调试截图用）。
- **配套**：`.env.example` 增 QWENPAW_* 清单；`docs/qwenpaw-log.md` 调优日志表就位；AGENTS.md 契约更新为 `run(input, { llm }?)` 并新增「Live 模式与降级」一节。
- **已验证**：`npm test` 9/9（测试文件未动）；eval:live 未配 key 时 7 条干净跳过；CLI mock 输出正确、`--live` 缺 key 明确报错退出 1；HTTP 全链路——起服务后忌口提问返回 dietary+二次确认+猪肉菜被过滤、海关提问返回 forbidden+high+拒答模板、启动日志正确显示当前模式。（注意：Windows 下用 curl 命令行直发中文会被 shell 编码弄乱、意图全落 recommendation，联调请用 `--data-binary @file.json` 发 UTF-8 文件体。）
- **待办**（依赖平台材料）：拿到 QwenPaw API 文档后适配 llm.js 两个函数；平台建好智能体、填好 `.env` 后跑通 `npm run eval:live` 并开始记调优日志。

## 2026-07-04 第十轮：QwenPaw 参赛接入规划与提示词资产

- 新增 **QWENPAW_PLAN.md**：在不改前端与 API 契约的前提下把智能体层真实跑在 QwenPaw 上的实施方案——agent 内部改为「有密钥调平台 / 无密钥或失败降级回 mock」；平台耦合收敛在待建的 `server/lib/llm.js` 单文件；`eval:live` 复用现有 9 条红线断言作为调优验收；risk-checker 有意不接 LLM（安全裁定纯代码）。含材料映射与至 8/9 的排期。
- 新增 **prompts/** 目录（7 个文件）：6 个智能体的系统提示词（可直接粘贴 QwenPaw）+ 用户消息格式 + 调优用例（与 agents.test.mjs 断言对应），README 说明使用步骤、温度建议、"裸 JSON 输出"等通用约定。
- 待办（依赖用户提供平台 API 文档）：`server/lib/llm.js`、`server/config.js`、各 agent 的 async 化与 `validate()` 红线后校验、`eval-live.test.mjs`。

## 2026-07-03 第九轮：暗色主题「霓虹夜场」（规范 P3）

- **机制**：`index.html` 内联脚本在首帧前按「localStorage(`aoweizhiyi_theme`) → 系统偏好」写入 `<html data-theme>`（无闪烁）；CSS 仅一个 `[data-theme="dark"]` 令牌覆写块 + `color-scheme: dark`（原生控件/滚动条自动跟随）；三端顶栏各有日/夜切换按钮（共用组件 `src/components/ThemeToggle.jsx`），切换即存。
- **关键前置改造（59 处批量替换）**：全站「把 `--ink` 当深色背景/边框」的表面改走**不翻转**的 `--ink-solid`，墨青面板上的米白文字改走 `--cream`——否则令牌翻转后 hero/CTA/顶栏这些深色面板会变白。夜场里墨青面板（#20342f）叠在更深的页面底（#151f1a）上形成层次。残留硬编码浅色（#f2eee4/#e9e2d2/#f1eee6/#fffdf8/#fffefb/背景 #fff 等）同步收编进令牌，浅色模式视觉零差异。
- **设计决策**：菜单纸与「给店员看」卡在夜场**保持米白**（局部令牌重设即可，内部规则原样生效）——夜街上发光的纸菜单；QR 码强制白底（扫码可靠性）；深底上的福隆红文字提亮为 #e0806a（红色背景不动，按钮白字对比不受影响）；错误/警示/蓝章三类浅色底徽章各配暗色档。
- **已验证**：切换→body #151f1a/文字米白/localStorage 持久化/刷新保持；菜单纸文字保持墨青 rgb(32,52,47)；店铺页价格红提亮、吸顶栏深色毛玻璃、弹窗深卡色；商户端 shell/侧栏/顶栏/统计卡四层深色正确；管理端徽章暗金配色；375px 无溢出（切换按钮 23px 挤压档）；往返切换正常；三端控制台零报错；`npm test` 9/9；构建通过。
- 注意：`.language-switcher--dark button.active` 的 border 在批量替换中连带改为 `--cream`（原为 `--paper`），浅色下同值无差异，暗色下反而正确，属良性连带。

## 2026-07-03 第八轮：功能缺口修复 + 性能 + 测试

- **语言记忆**：游客语言选择存 localStorage（`aoweizhiyi_lang`），刷新/回访不再跳回中文；存储值不合法时回退 zh，私隐模式静默降级。已验证：切 EN → 刷新仍为英文。
- **弹窗焦点圈禁**：菜品详情弹窗 Tab/Shift+Tab 焦点在弹窗内回绕，打开时聚焦弹窗内首个按钮，关闭时焦点归还触发元素（ESC 原有）。已验证：末尾 Tab 的 defaultPrevented=true 且回绕到关闭按钮。
- **路由级代码分割**：MerchantStudio/AdminConsole 改 `React.lazy` + Suspense（fallback 复用 shop-detail-state 载入态）。游客端主包 333.5KB→256.2KB（gzip 109→84.4KB），商户端 68.8KB JS + 26.3KB CSS、管理端 11.1KB + 9KB 均变为按需 chunk，CSS 随 JS 自动拆分。
- **Agent 冒烟测试**：新增 `server/agents.test.mjs`（node:test，零依赖，9 条全过），断言各 agent 的安全红线：忌口过滤+强制确认、医疗/海关拒答 risk=high、识别结果全部待确认、坏行跳过并警告、翻译未命中显式草稿标记、忌口 FAQ 强制确认、折扣不逐字引用、风险旗标矛盾检测。`npm test` 运行。
  - 坑：`node --test server`（目录形式）会把 `server/index.js` 也当测试执行导致 EADDRINUSE，脚本必须精确指定测试文件。
- 管理端表格搜索在本轮开工前已由另一处修改实现（含 `.admin-table-empty` 空态），未重复改动。
- 未做（有意）：未知 `?page=` 值的 404 提示（价值低）；暗色主题需先补齐语义层令牌（见规范路线图 P3）。

## 2026-07-03 第七轮：UI/UX 美化落地（按规范 P0 + 部分 P1/P2）

按 DESIGN_SYSTEM.md（已更名为「澳味智译·視覺與體驗規範 v1.1」，去掉概念化命名）执行，全部改动经浏览器逐项验证、三端控制台零报错、375px 无溢出：

- **可读性（P0）**：三份 CSS 中 8.5px 以下文本共 58 处提升（7→9.5 / 7.5→9.5 / 8→10 / 8.5→10.5）；唯一保留的 6px 是进度环里的「%」纯符号。
- **绿色归一（P0）**：原先十余种微差绿（#4f7459/#4d6c53/#557b5e/#66806a 等 44 处）收敛为 `--moss-100/200/400/500/700/800` 六档令牌，已入 `:root`。
- **金字对比（P0）**：纸面上做文字的 `--gold`（≈2.5:1）全部改 `--gold-700 #8a672a`（paper-index、story-number、店卡 topline、FAQ 序号、商户端各序号列）；深底上的金不动。
- **章压影纯化（P0）**：`.step-icon` 的 rgba 阴影改实色 `var(--line)`（章压语言禁 rgba）。
- **三端角色色（P2）**：主行动按钮三端保持福隆红；环境信号各归其位——商户端侧栏选中金色高亮条 + kicker/进度环转金（餅金＝賬房），管理端侧栏蓝色高亮条 + 页头 kicker 转瓷砖蓝（門牌＝公證），游客端维持福隆红。
- **动效（P2）**：新增「霓虹息」（在线圆点 2.4s glow 呼吸，仅授权 live 状态点，每屏 ≤2 处）与「换场」（路由切换 main 240ms 淡入；main 仅在视图切换时重挂载，语言切换不触发）；返回链接箭头 hover 左移、FAQ 提问卡 hover 上浮。全部挂入 `prefers-reduced-motion`。
- 批量替换脚本方式执行（44+12+58 处），构建通过（CSS 78.6KB）。剩余工作见规范路线图：其余裸色归仓、状态徽章组件化、暗色主题。

## 2026-07-03 第六轮：设计系统规划（DESIGN_SYSTEM.md）

- 新增 **DESIGN_SYSTEM.md（濠鏡設計系統 v1.0）**：不推翻现有 LocalBridge 视觉，走「系统化＋提纯＋一笔科技光」路线。核心决策：三层色彩令牌（原色/语义/组件）；三端角色色（游客红/商户金/平台蓝，仅作环境提示，主行动色三端统一福隆红）；七级字阶并强制 12px 正文下限（现存 7–9px 文本为违例）；两种阴影语言（章压/浮纸）不得同体；「霓虹 glow 只给活物、每屏 ≤2 处」作为唯一科技感语彙；状态语义色统一（现存十种微差绿收敛为 moss 三档）。
- 文档含**现状审计**（违例清单精确到选择器）与 **P0–P3 分期路线图**（快赢→令牌化→组件精修→暗色夜场），每期有独立验收标准。本轮为纯规划，未动样式代码；实施从 P0 开始按期推进。

## 2026-07-03 第五轮：视觉打磨

不改结构/功能，只做「精致感」相关的小成本高回报改动：

- **Favicon**：内联 SVG data URI（红底「味」字，呼应 `.brand-mark` 印章样式），无需额外资源文件。
- **全局质感**：`::selection` 改为金色高亮；`html` 自定义细滚动条（金/纸色），替代系统默认灰色滚动条。
- **印章按压反馈**：`.primary-button`、`.merchant-cta button`、`.ms-primary` 新增 `:active` 态——按下时阴影收平、位移到阴影原位，呼应整体的盖章/贴纸视觉语言（新规则统一追加在各 CSS 文件末尾，源码顺序保证覆盖已有的 `:hover` 位移）。
- **首页骨架屏**：`loading` 态从纯文字+spinner 换成 3 张与真实 `.shop-card` 同尺寸的骨架卡片（shimmer 扫光动画），数据到达后不再有布局跳动；同时删除了只用过一次的旧 `.loading-state` 规则。
- **进场动效**：首页「今日想吃」三行菜单、「三步」引导卡片、店铺网格卡片新增淡入上浮动效（`@keyframes reveal`，按顺序错开延迟）；已加 `prefers-reduced-motion` 保护。店铺网格卡片改为在外层包一层 `.reveal` div 承载动效，不影响 `.shop-card` 本身的 hover 位移（两者分离，避免 `animation: forwards` 与 `:hover transform` 抢占同一属性的经典坑）。
- **空状态图标**：`.empty-state`、`.shop-detail-state`、`.admin-empty` 的线框图标统一加一层纸色圆底，不再孤零零漂浮。
- 验证方式：本轮浏览器截图工具在当前会话环境下持续超时（诊断为预览标签页 `document.visibilityState === "hidden"` 导致 Chromium 冻结动画时间轴与合成帧，与代码改动无关）；改用 `preview_eval` 做等价验证——`getAnimations()` 强制 `finish()` 后确认动效终态正确（opacity:1、transform 归位）、逐条核对新增 CSS 规则已生效（`document.styleSheets` 检索）、骨架屏尺寸与真实卡片一致、桌面/375px 移动端均无横向溢出、首页/店铺页/商户登录页控制台零报错。真实前台标签页中动效会正常播放。

## 2026-07-02 第四轮：Agent 架构显性化 + 参考后端

- **AGENTS.md**：正式定义平台的 7 个 Agent（接待问答/菜单识别/建档/翻译/FAQ 生成/营销文案/风险检查），含各自端点、输入输出、安全红线与五条独立性契约（纯函数、数据注入、零横向依赖、可单独调用、失败隔离）。
- **参考后端 `server/`**（零第三方依赖，`npm run server`，端口 8788）：实现 API_CONTRACT 全部端点。每个 Agent 一个独立模块（`server/agents/*.js`），互相不 import，数据由路由层注入；`npm run agent -- <name> '<json>'` 可脱离 HTTP 单独调用任一 Agent。
- **已验证**（正式 API 模式端到端）：游客问答（忌口过滤+确认提示、医疗/海关拒答）、商户登录/翻译/FAQ 生成/营销（brief 提折扣不逐字引用）、提交审核 → 管理员队列风险标记 → 批准 → 游客端菜单实时更新、商户/管理员令牌互不通用、退回必填原因。
- 前端一行调整：`MerchantStudio` 状态徽章改为 `review_status` 优先（审核中/被退回时商户看到流程状态，游客端仍按 `publication_status` 显示线上菜单，版本隔离不受影响）。
- 本地联调：`npm run server` + `.env.local` 写 `VITE_API_BASE_URL=http://localhost:8788`（vite 会自动重启）。参考后端为内存存储，重启即重置；登录为演示桩（任意账号+非空密码），正式环境必须替换。

## 2026-07-02 第三轮：页面结构与视觉

- **移动端导航修复**：≤650px 时主导航原来 `display:none` 且无替代入口，手机用户到不了商户入口。现在导航常驻（品牌副标题在窄屏隐藏、语言按钮收紧，375px 无横向溢出）。
- **信息架构调整**：「平台审核」从游客主导航降级到页脚「快速入口」（内部功能不该占游客视线；路由 `/?page=admin` 不变）。页脚重建为品牌＋快速入口＋地区语言三段式。
- **首页结构补全**：新增「三步，看懂一間小店」引导条（hero 与店铺列表之间）与页尾商户转化区（FOR SHOP OWNERS 深色 CTA 带），文案已配齐中英葡日四语（i18n 新增 `steps`/`ctaTitle`/`ctaText`/`ctaButton`/`tabFaq`/`footerNav`）。
- **商户端侧边栏分组**：11 个平铺导航项改为四组——營運概覽／菜單更新流程（01–05，与概览页步骤条一致）／店舖經營／增長工具。
- **视觉细节**：移动端竖招牌不再被视口裁切、也不遮菜价（菜单纸右侧留出落位）；店铺页 hero 元信息补充营业时间；FAQ 标签改走 i18n。
- 注意：新组件的响应式覆盖规则集中在 styles.css 文件末尾（必须位于基础规则之后，同优先级后者胜出）。

## 2026-07-02 第二轮修订

- **分类契约对齐**：商户端菜品分类此前以中文标签（“主食”）作为存储值，与 API 契约及游客端筛选用的稳定 id（`main`/`snack`/…）不一致，导致商户流程发布的菜单在游客端分类失效。现统一存 id，中文仅作显示；`normalizeCategory` 兼容旧的中文值。
- **非安全上下文兼容**（`src/lib/util.js`）：`crypto.randomUUID` 与 `navigator.clipboard` 在手机经局域网 `http://192.168.x.x` 访问时不存在（dev 绑定 0.0.0.0 正是为了真机测试）。之前新增菜品会直接崩溃、复制按钮静默失效；现统一走 `uid()` / `copyText()` 降级。
- **商户与管理员令牌隔离**（`src/lib/api.js`）：分开 sessionStorage key，请求按 `/v1/admin` 前缀选 token；`hasSession`/`logout` 支持 scope。商户登录态不再被误判为管理员登录态。
- **删除死代码**：`App.jsx` 中被 `MerchantStudio` 取代的旧 `Merchant` 组件（约 106 行）已移除。`i18n.js` 中 `merchantTitle` 等旧 key 暂保留（无引用、无害）。
- **依赖钉版本**：`package.json` 由全部 `latest` 改为锁定版本（react 19.2.7 / vite 8.1.2 等，与原 pnpm-lock 一致），vite 与 plugin 移入 devDependencies。
- 小修：切换语言不再把商户工作台重置到第一间店铺；管理后台表格搜索框可用（原为装饰）；QR 尚未生成时不再渲染空 `href` 的 PNG 下载链接。

## 当前验证状态

- `npm run build` 已通过（vite 8.1.3）。
- 游客首页、店铺问答（demo 回答 + 反馈按钮）已在浏览器验证。
- 商户示范工作台：分类下拉存稳定 id、新增菜品、发布面板真实 QR（PNG/SVG/复制链接）已验证。
- 管理员示范后台：登录、游客反馈表格搜索筛选已验证。
- 以上均为离线演示模式验证；正式 API 模式的接口行为未变（仅令牌选择逻辑按 scope 拆分）。

