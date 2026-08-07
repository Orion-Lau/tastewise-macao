// 菜單識別 Agent（menu-extractor）
// 正式環境：接收原檔（PDF/JPG/PNG/HEIC），經 OCR + LLM 結構化爲菜品草稿。
// 參考實現不接 OCR，返回固定示範草稿並如實標註 warnings；
// 所有識別結果 confirmed=false，必須經商戶逐項校對。

const TEMPLATE_ITEMS = [
  { id: "ext-1", category: "snack", price: 32, name: { zh: "招牌豬扒包" }, desc: { zh: "豬扒即叫即炸" }, allergens: { pork: true }, confirmed: false },
  { id: "ext-2", category: "main", price: 48, name: { zh: "乾炒牛河" }, desc: { zh: "大火豉油乾炒" }, allergens: { beef: true }, confirmed: false },
  { id: "ext-3", category: "drink", price: 20, name: { zh: "絲襪奶茶" }, desc: { zh: "茶味厚、奶香順" }, allergens: { eggdairy: true }, confirmed: false },
  { id: "ext-4", category: "dessert", price: 0, name: { zh: "楊枝甘露" }, desc: { zh: "" }, allergens: {}, confirmed: false },
];

export function run({ shopName = "", filename = "", size = 0 }) {
  const warnings = [
    "參考實現未接 OCR，以下為示範草稿；正式環境將解析上傳原檔。",
    "第 4 項「楊枝甘露」價格無法確認，已置 0，請人工校對。",
  ];
  if (!filename) warnings.push("未取得檔案名稱。");
  return {
    import_id: `import-${Date.now().toString(36)}`,
    shop_name: shopName,
    source_file: { filename, size },
    items: TEMPLATE_ITEMS.map((item) => ({ ...item, name: { ...item.name }, desc: { ...item.desc }, allergens: { ...item.allergens } })),
    warnings,
  };
}

