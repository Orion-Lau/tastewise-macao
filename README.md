# 澳味智譯 Web（TasteWise Macao）

「澳味智譯」是一個以 LocalBridge 的澳門舊城視覺爲主、吸收 TasteWise 菜單與多語問答能力的可運行 Web 應用。

## 本地運行

```powershell
pnpm install   # 或 npm install
pnpm dev       # 或 npm run dev
```

默認地址：`http://localhost:4173`

## 視覺設計系統

三端共用的視覺語言規範（色彩令牌、字階、陰影/動效語言、狀態語義、實施路線圖）見
[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)。改樣式前請先讀它。

## Agent 架構與本地參考後端

平臺的 AI 能力拆分爲 7 個彼此獨立的 Agent（定義與紅線見 [AGENTS.md](./AGENTS.md)）。倉庫內置零依賴參考後端：

```powershell
npm run server                     # 啓動全部端點 http://localhost:8788
npm run agent -- risk-checker '{"items":[...]}'   # 脫離 HTTP 單獨調用任一 Agent
```

配合 `.env.local` 寫入 `VITE_API_BASE_URL=http://localhost:8788` 即可在本地體驗完整「商戶提交 → 平臺審覈 → 遊客可見」流程。

## 接入真實 API

複製 `.env.example` 爲 `.env.local`，填寫：

```env
VITE_API_BASE_URL=https://your-api.example.com
VITE_API_TOKEN=public-or-short-lived-token
```

完整請求、響應字段及安全要求見 [API_CONTRACT.md](./API_CONTRACT.md)。配置 API 後不會靜默使用樣例數據；接口失敗會直接顯示錯誤，便於發現集成問題。

前端已實現以下接口：

### 商戶登錄

`POST /v1/auth/login`

請求 `{ "identifier": "...", "password": "..." }`，返回 `{ "access_token": "..." }`。令牌僅保存在當前瀏覽器會話中。

### 獲取店鋪

`GET /v1/shops?city=macao&locale=zh`

返回數組或 `{ "data": [...] }` / `{ "shops": [...] }`。店鋪字段可使用 `dishes` 或 `items`。

### 店鋪問答

`POST /v1/shops/:id/assistant`

請求：

```json
{ "query": "我不喫豬肉，有什麼選擇？", "locale": "zh" }
```

返回：

```json
{
  "answer": "可選擇……",
  "related_dish_ids": ["beef-hofun"]
}
```

### 導入菜單

`POST /v1/merchant/menu-import`，使用 `multipart/form-data`：

- `shop_name`: 店鋪名稱
- `locale`: `zh` / `en` / `pt` / `ja`
- `menu`: PDF、JPG、PNG 或 HEIC 原文件

返回可包含 `items`、`dishes` 或 `item_count`，界面會顯示識別數量。上傳超時爲 60 秒，普通請求超時爲 20 秒。

### 商戶正式工作流

- `GET /v1/merchant/dashboard`：工作臺數據
- `PUT /v1/merchant/shops/:id/menu-draft`：保存校對後的菜單草稿
- `POST /v1/merchant/shops/:id/translate`：生成多語言草稿
- `POST /v1/merchant/shops/:id/menu-submit`：提交平臺審覈

工作臺包含菜品校對、食安與忌口逐項確認、多語言完成度、審覈狀態、遊客頁預覽，以及由真實線上 URL 生成的可下載 QR Code。

> `VITE_*` 會進入瀏覽器構建產物。永久 API 密鑰必須保存在服務端代理；前端只應使用公開或短效令牌。若未配置 API，應用自動使用內置示範店鋪和本地問答，不影響 UI 驗收。

## 取捨說明

- 遊客端：找店、分類與忌口篩選、菜品詳情、四語菜單、FAQ、店鋪問答、匿名反饋和掃碼深鏈接。
- 商戶端：多店管理、文字建檔、拍照／文件導入、菜單校對、食安確認、翻譯、店鋪資料、FAQ、營銷文案、匿名洞察、審覈狀態及發佈物料。
- 平臺端：待審覈隊列、字段風險提示、通過／退回、遊客反饋及審計日誌。
- 僅移除：賽事標籤、參賽數據、面向用戶的 Agent 流水線宣傳和原型重置入口。
- 視覺：保留 LocalBridge 的墨青、福隆紅、紙白、金色、直書招牌與葡式碎石路紋樣，重新整理成桌面／移動端統一界面。

