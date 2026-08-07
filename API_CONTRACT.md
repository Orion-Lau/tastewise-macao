# 澳味智譯 API Contract v1

配置 `VITE_API_BASE_URL` 後，前端進入正式 API 模式。此模式下不會讀取或回退到內置示範店鋪；任何請求失敗都會在相應頁面顯示錯誤。

## 通用約定

- Base URL：例如 `https://api.example.com`
- Content-Type：除文件上傳外均爲 `application/json`
- 認證：`Authorization: Bearer <access_token>`
- 登錄令牌僅保存在 `sessionStorage`
- 成功響應可以直接返回業務對象，也可以包裝爲 `{ "data": ... }`
- 錯誤響應：`{ "message": "可展示給用戶的錯誤信息" }`
- 時間使用 ISO 8601
- `locale`：`zh`、`en`、`pt`、`ja`
- 發佈狀態：`draft`、`pending`、`published`、`rejected`、`unpublished`

## 公共遊客接口

### GET `/v1/shops?city=macao&locale=zh`

返回：

```json
{
  "shops": [
    {
      "id": "san-son-heng",
      "publication_status": "published",
      "name": { "zh": "新順興茶餐廳", "en": "San Son Heng Café", "pt": "...", "ja": "..." },
      "type": { "zh": "茶餐廳", "en": "Neighbourhood café" },
      "district": { "zh": "十月初五街", "en": "Rua de Cinco de Outubro" },
      "address": "...",
      "phone": "+853 ...",
      "hours": "07:30–18:00",
      "payments": ["現金", "澳門通", "支付寶"],
      "rating": 4.8,
      "price_level": "$$",
      "story": { "zh": "...", "en": "..." },
      "dishes": [],
      "faqs": []
    }
  ]
}
```

### GET `/v1/shops/:shopId?locale=zh`

返回完整店鋪對象。二維碼深鏈接會直接調用此接口，因此不能只返回列表摘要。

菜品結構：

```json
{
  "id": "dish-1",
  "category": "main",
  "name": { "zh": "葡國雞飯", "en": "Portuguese Chicken Rice", "pt": "...", "ja": "..." },
  "description": { "zh": "...", "en": "...", "pt": "...", "ja": "..." },
  "price": 58,
  "featured": true,
  "soldout": false,
  "tags": ["招牌", "含蛋奶"],
  "ingredients": ["雞肉", "椰奶", "咖喱"],
  "allergens": {
    "pork": false,
    "beef": false,
    "seafood": false,
    "nuts": false,
    "eggdairy": true,
    "vegetarian": false
  },
  "recommendation_reason": { "zh": "...", "en": "..." },
  "owner_note": { "zh": "...", "en": "..." }
}
```

FAQ 結構：

```json
{
  "id": "faq-1",
  "question": { "zh": "可以用支付寶嗎？", "en": "Do you accept Alipay?" },
  "answer": { "zh": "可以。", "en": "Yes." },
  "requires_confirmation": false
}
```

### POST `/v1/shops/:shopId/assistant`

請求：

```json
{ "query": "我不喫豬肉，有什麼選擇？", "locale": "zh" }
```

返回：

```json
{
  "message_id": "answer-uuid",
  "answer": "可選擇……",
  "related_dish_ids": ["dish-2"],
  "risk": "low",
  "requires_confirmation": true,
  "source": "owner_confirmed"
}
```

Agent 必須只使用已發佈、店主確認的店鋪資料。資料缺失時應明確回答“不確定”，不可推測食安、醫療、海關或法律結論。

### POST `/v1/shops/:shopId/feedback`

```json
{
  "message_id": "answer-uuid",
  "helpful": false,
  "category": "assistant_answer"
}
```

不應要求或保存遊客身份。

## 認證接口

### POST `/v1/auth/login`

商戶登錄：

```json
{ "identifier": "merchant@example.com", "password": "..." }
```

### POST `/v1/admin/auth/login`

管理員登錄。兩者均返回：

```json
{ "access_token": "short-lived-jwt", "expires_in": 3600 }
```

永久密鑰不得返回瀏覽器。

### POST `/v1/auth/password-reset/request`

請求 `{ "identifier": "merchant@example.com" }`。無論賬號是否存在都應返回相同的成功提示，避免泄露註冊狀態。

## 商戶接口

### GET `/v1/merchant/shops?locale=zh`

返回 `{ "shops": [...] }`。每個店鋪應包含當前 `items` 或 `dishes`、發佈狀態和可能的 `rejection_reason`。

### GET `/v1/merchant/dashboard?locale=zh`

```json
{
  "questions_this_week": 26,
  "activities": [
    { "id": "a1", "type": "publish", "title": "菜單已發佈", "created_at": "2026-07-02T10:24:00+08:00" }
  ]
}
```

### POST `/v1/merchant/shops`

文字建檔：

```json
{
  "description": "我們是十月初五街的家庭茶餐廳……",
  "menu_text": "豬扒包 32\n幹炒牛河 48",
  "locale": "zh"
}
```

返回 `{ "shop": <完整店鋪草稿> }`。任何不確定字段必須標記待確認，不能由 Agent 猜測。

### PUT `/v1/merchant/shops/:shopId`

保存店鋪資料：名稱、地址、電話、營業時間、支付方式和故事。

### POST `/v1/merchant/shops/:shopId/media`

`multipart/form-data`：`kind=cover`、`file=<image>`。服務端校驗後返回 `{ "url": "https://..." }`。

### POST `/v1/merchant/menu-import`

`multipart/form-data`：

- `shop_name`
- `locale`
- `menu`：PDF、JPG、PNG 或 HEIC，最大 10MB

返回：

```json
{
  "import_id": "import-uuid",
  "items": [<菜品結構>],
  "warnings": ["第 3 行價格不確定"]
}
```

### PUT `/v1/merchant/shops/:shopId/menu-draft`

```json
{ "items": [<校對後的菜品>] }
```

### POST `/v1/merchant/shops/:shopId/translate`

```json
{ "items": [<菜品>], "locales": ["en", "pt", "ja"] }
```

返回 `{ "items": [...] }`。翻譯爲草稿，不能自動發佈。

### GET/PUT `/v1/merchant/shops/:shopId/faqs`

GET 返回 `{ "faqs": [...] }`；PUT 請求 `{ "faqs": [...] }`。

### POST `/v1/merchant/shops/:shopId/faqs/generate`

```json
{ "locale": "zh" }
```

返回 `{ "faqs": [...] }`。只能根據店鋪檔案生成。

### POST `/v1/merchant/shops/:shopId/marketing-copy`

```json
{
  "platform": "xiaohongshu",
  "brief": "中秋主推杏仁餅禮盒，不可虛構折扣",
  "locale": "zh"
}
```

返回：

```json
{ "title": "...", "body": "...", "tags": ["澳門美食"] }
```

### GET `/v1/merchant/shops/:shopId/insights?range=30d`

```json
{
  "total_questions": 120,
  "staff_confirmation_rate": 18,
  "helpful_rate": 91,
  "unanswered": 4,
  "categories": [
    { "key": "recommendation", "label": "招牌推薦", "count": 38 }
  ]
}
```

只能返回匿名聚合數據。

### POST `/v1/merchant/shops/:shopId/menu-submit`

請求 `{ "items": [...] }`，返回：

```json
{ "review_id": "review-uuid", "status": "pending" }
```

審覈期間必須繼續提供原有已發佈菜單。退回後，商戶店鋪對象應返回 `publication_status: "rejected"` 和 `rejection_reason`。

## 管理員接口

### GET `/v1/admin/reviews?status=pending`

```json
{
  "reviews": [
    {
      "id": "review-uuid",
      "type": "menu_update",
      "shop_name": "新順興茶餐廳",
      "submitted_at": "...",
      "items": [<菜品結構>]
    }
  ]
}
```

### POST `/v1/admin/reviews/:reviewId/decision`

通過：`{ "decision": "approve", "reason": "" }`

退回：`{ "decision": "reject", "reason": "具體且可執行的退回原因" }`

服務端必須記錄管理員、時間、原數據版本與決定。

### GET `/v1/admin/feedback`

返回 `{ "feedback": [...] }`，字段包括 `id`、`shop_name`、`category`、`helpful`、`created_at`，不包含遊客身份。

### GET `/v1/admin/audit-log`

返回 `{ "logs": [...] }`，字段包括 `id`、`created_at`、`actor`、`action`、`target`。

## 部署要求

- API 允許前端域名的 CORS 請求。
- 登錄與寫入接口必須使用 HTTPS。
- 文件上傳由服務端再次校驗 MIME、大小和惡意內容。
- 管理員接口必須執行服務端角色校驗，不能依賴前端隱藏。
- 數據庫保存菜單版本；審覈期間線上菜單不能被草稿覆蓋。
- Agent 輸出必須經過 JSON Schema 驗證後才能寫入數據庫。

