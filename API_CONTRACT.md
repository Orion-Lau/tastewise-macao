# 澳味智译 API Contract v1

配置 `VITE_API_BASE_URL` 后，前端进入正式 API 模式。此模式下不会读取或回退到内置示范店铺；任何请求失败都会在相应页面显示错误。

## 通用约定

- Base URL：例如 `https://api.example.com`
- Content-Type：除文件上传外均为 `application/json`
- 认证：`Authorization: Bearer <access_token>`
- 登录令牌仅保存在 `sessionStorage`
- 成功响应可以直接返回业务对象，也可以包装为 `{ "data": ... }`
- 错误响应：`{ "message": "可展示给用户的错误信息" }`
- 时间使用 ISO 8601
- `locale`：`zh`、`en`、`pt`、`ja`
- 发布状态：`draft`、`pending`、`published`、`rejected`、`unpublished`

## 公共游客接口

### GET `/v1/shops?city=macao&locale=zh`

返回：

```json
{
  "shops": [
    {
      "id": "san-son-heng",
      "publication_status": "published",
      "name": { "zh": "新顺兴茶餐厅", "en": "San Son Heng Café", "pt": "...", "ja": "..." },
      "type": { "zh": "茶餐厅", "en": "Neighbourhood café" },
      "district": { "zh": "十月初五街", "en": "Rua de Cinco de Outubro" },
      "address": "...",
      "phone": "+853 ...",
      "hours": "07:30–18:00",
      "payments": ["现金", "澳门通", "支付宝"],
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

返回完整店铺对象。二维码深链接会直接调用此接口，因此不能只返回列表摘要。

菜品结构：

```json
{
  "id": "dish-1",
  "category": "main",
  "name": { "zh": "葡国鸡饭", "en": "Portuguese Chicken Rice", "pt": "...", "ja": "..." },
  "description": { "zh": "...", "en": "...", "pt": "...", "ja": "..." },
  "price": 58,
  "featured": true,
  "soldout": false,
  "tags": ["招牌", "含蛋奶"],
  "ingredients": ["鸡肉", "椰奶", "咖喱"],
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

FAQ 结构：

```json
{
  "id": "faq-1",
  "question": { "zh": "可以用支付宝吗？", "en": "Do you accept Alipay?" },
  "answer": { "zh": "可以。", "en": "Yes." },
  "requires_confirmation": false
}
```

### POST `/v1/shops/:shopId/assistant`

请求：

```json
{ "query": "我不吃猪肉，有什么选择？", "locale": "zh" }
```

返回：

```json
{
  "message_id": "answer-uuid",
  "answer": "可选择……",
  "related_dish_ids": ["dish-2"],
  "risk": "low",
  "requires_confirmation": true,
  "source": "owner_confirmed"
}
```

Agent 必须只使用已发布、店主确认的店铺资料。资料缺失时应明确回答“不确定”，不可推测食安、医疗、海关或法律结论。

### POST `/v1/shops/:shopId/feedback`

```json
{
  "message_id": "answer-uuid",
  "helpful": false,
  "category": "assistant_answer"
}
```

不应要求或保存游客身份。

## 认证接口

### POST `/v1/auth/login`

商户登录：

```json
{ "identifier": "merchant@example.com", "password": "..." }
```

### POST `/v1/admin/auth/login`

管理员登录。两者均返回：

```json
{ "access_token": "short-lived-jwt", "expires_in": 3600 }
```

永久密钥不得返回浏览器。

### POST `/v1/auth/password-reset/request`

请求 `{ "identifier": "merchant@example.com" }`。无论账号是否存在都应返回相同的成功提示，避免泄露注册状态。

## 商户接口

### GET `/v1/merchant/shops?locale=zh`

返回 `{ "shops": [...] }`。每个店铺应包含当前 `items` 或 `dishes`、发布状态和可能的 `rejection_reason`。

### GET `/v1/merchant/dashboard?locale=zh`

```json
{
  "questions_this_week": 26,
  "activities": [
    { "id": "a1", "type": "publish", "title": "菜单已发布", "created_at": "2026-07-02T10:24:00+08:00" }
  ]
}
```

### POST `/v1/merchant/shops`

文字建档：

```json
{
  "description": "我们是十月初五街的家庭茶餐厅……",
  "menu_text": "猪扒包 32\n干炒牛河 48",
  "locale": "zh"
}
```

返回 `{ "shop": <完整店铺草稿> }`。任何不确定字段必须标记待确认，不能由 Agent 猜测。

### PUT `/v1/merchant/shops/:shopId`

保存店铺资料：名称、地址、电话、营业时间、支付方式和故事。

### POST `/v1/merchant/shops/:shopId/media`

`multipart/form-data`：`kind=cover`、`file=<image>`。服务端校验后返回 `{ "url": "https://..." }`。

### POST `/v1/merchant/menu-import`

`multipart/form-data`：

- `shop_name`
- `locale`
- `menu`：PDF、JPG、PNG 或 HEIC，最大 10MB

返回：

```json
{
  "import_id": "import-uuid",
  "items": [<菜品结构>],
  "warnings": ["第 3 行价格不确定"]
}
```

### PUT `/v1/merchant/shops/:shopId/menu-draft`

```json
{ "items": [<校对后的菜品>] }
```

### POST `/v1/merchant/shops/:shopId/translate`

```json
{ "items": [<菜品>], "locales": ["en", "pt", "ja"] }
```

返回 `{ "items": [...] }`。翻译为草稿，不能自动发布。

### GET/PUT `/v1/merchant/shops/:shopId/faqs`

GET 返回 `{ "faqs": [...] }`；PUT 请求 `{ "faqs": [...] }`。

### POST `/v1/merchant/shops/:shopId/faqs/generate`

```json
{ "locale": "zh" }
```

返回 `{ "faqs": [...] }`。只能根据店铺档案生成。

### POST `/v1/merchant/shops/:shopId/marketing-copy`

```json
{
  "platform": "xiaohongshu",
  "brief": "中秋主推杏仁饼礼盒，不可虚构折扣",
  "locale": "zh"
}
```

返回：

```json
{ "title": "...", "body": "...", "tags": ["澳门美食"] }
```

### GET `/v1/merchant/shops/:shopId/insights?range=30d`

```json
{
  "total_questions": 120,
  "staff_confirmation_rate": 18,
  "helpful_rate": 91,
  "unanswered": 4,
  "categories": [
    { "key": "recommendation", "label": "招牌推荐", "count": 38 }
  ]
}
```

只能返回匿名聚合数据。

### POST `/v1/merchant/shops/:shopId/menu-submit`

请求 `{ "items": [...] }`，返回：

```json
{ "review_id": "review-uuid", "status": "pending" }
```

审核期间必须继续提供原有已发布菜单。退回后，商户店铺对象应返回 `publication_status: "rejected"` 和 `rejection_reason`。

## 管理员接口

### GET `/v1/admin/reviews?status=pending`

```json
{
  "reviews": [
    {
      "id": "review-uuid",
      "type": "menu_update",
      "shop_name": "新顺兴茶餐厅",
      "submitted_at": "...",
      "items": [<菜品结构>]
    }
  ]
}
```

### POST `/v1/admin/reviews/:reviewId/decision`

通过：`{ "decision": "approve", "reason": "" }`

退回：`{ "decision": "reject", "reason": "具体且可执行的退回原因" }`

服务端必须记录管理员、时间、原数据版本与决定。

### GET `/v1/admin/feedback`

返回 `{ "feedback": [...] }`，字段包括 `id`、`shop_name`、`category`、`helpful`、`created_at`，不包含游客身份。

### GET `/v1/admin/audit-log`

返回 `{ "logs": [...] }`，字段包括 `id`、`created_at`、`actor`、`action`、`target`。

## 部署要求

- API 允许前端域名的 CORS 请求。
- 登录与写入接口必须使用 HTTPS。
- 文件上传由服务端再次校验 MIME、大小和恶意内容。
- 管理员接口必须执行服务端角色校验，不能依赖前端隐藏。
- 数据库保存菜单版本；审核期间线上菜单不能被草稿覆盖。
- Agent 输出必须经过 JSON Schema 验证后才能写入数据库。
