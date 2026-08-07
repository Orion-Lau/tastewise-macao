// Agent 冒烟测试：node --test server
// 每个 agent 都是纯函数，直接断言输入输出与安全红线，不启 HTTP、不碰数据层。
import test from "node:test";
import assert from "node:assert/strict";
import * as assistant from "./agents/assistant.js";
import * as extractor from "./agents/menu-extractor.js";
import * as onboarding from "./agents/onboarding.js";
import * as translator from "./agents/translator.js";
import * as faqGenerator from "./agents/faq-generator.js";
import * as marketing from "./agents/marketing.js";
import * as riskChecker from "./agents/risk-checker.js";

const SHOP = {
  name: { zh: "測試茶餐廳" },
  district: { zh: "十月初五街" },
  type: { zh: "茶餐廳" },
  story: { zh: "開業四十年的街坊小店。" },
  hours: "09:00–18:00",
  payments: ["現金", "澳門通"],
  dishes: [
    { id: "pork-bun", price: 32, featured: true, name: { zh: "豬扒包" }, desc: { zh: "即叫即炸" }, tags: ["含豬肉"], allergens: { pork: true } },
    { id: "milk-tea", price: 20, name: { zh: "絲襪奶茶" }, desc: { zh: "茶味厚" }, tags: [], allergens: {} },
  ],
};

test("assistant: 忌口提问过滤含猪肉菜品并强制二次确认", () => {
  const result = assistant.run({ shop: SHOP, query: "我不吃豬肉有什麼選擇", locale: "zh" });
  assert.equal(result.intent, "dietary");
  assert.equal(result.requires_confirmation, true);
  assert.ok(!result.related_dish_ids.includes("pork-bun"), "含猪肉菜品不得进入推荐");
  assert.ok(result.related_dish_ids.includes("milk-tea"));
});

test("assistant: 医疗/海关问题拒绝推测且 risk=high", () => {
  const result = assistant.run({ shop: SHOP, query: "這個藥可以帶過海關嗎", locale: "zh" });
  assert.equal(result.intent, "forbidden");
  assert.equal(result.risk, "high");
  assert.equal(result.requires_confirmation, true);
});

test("assistant: 支付提问只引用店铺档案", () => {
  const result = assistant.run({ shop: SHOP, query: "可以用支付寶嗎", locale: "zh" });
  assert.equal(result.intent, "payment");
  assert.ok(result.answer.includes("現金"));
});

test("menu-extractor: 识别结果全部待确认并如实声明", () => {
  const result = extractor.run({ shopName: "測試", filename: "menu.jpg", size: 1024 });
  assert.ok(result.import_id);
  assert.ok(result.items.length > 0);
  assert.ok(result.items.every((item) => item.confirmed === false), "识别结果必须待人工校对");
  assert.ok(result.warnings.length >= 1);
});

test("onboarding: 解析菜单文字、跳过坏行并警告、产出草稿", () => {
  const result = onboarding.run({ description: "老字號粥店，1985年開業", menuText: "艇仔粥 30\n亂七八糟一行\n凍檸茶 18" });
  assert.equal(result.shop.publication_status, "draft");
  assert.equal(result.shop.name.zh, "老字號粥店");
  assert.equal(result.shop.dishes.length, 2);
  assert.equal(result.shop.dishes[0].price, 30);
  assert.equal(result.shop.dishes[1].category, "drink");
  assert.ok(result.shop.dishes.every((dish) => dish.confirmed === false));
  assert.equal(result.warnings.length, 1);
});

test("translator: 词典命中出译文，未命中出显式草稿占位并警告", () => {
  const result = translator.run({
    items: [{ id: "x", name: { zh: "豬扒包" }, desc: { zh: "" } }],
    lexicon: { "豬扒包": { en: "Pork Chop Bun", pt: "Pão com costeleta", ja: "ポークチョップバーガー" } },
  });
  assert.equal(result.status, "draft");
  assert.equal(result.items[0].name.en, "Pork Chop Bun");
  const noLexicon = translator.run({ items: [{ id: "y", name: { zh: "自創新菜" }, desc: { zh: "" } }] });
  assert.ok(noLexicon.items[0].name.en.includes("draft"), "未命中必须带草稿标记");
  assert.ok(noLexicon.warnings.length > 0);
});

test("faq-generator: 只依据档案生成，忌口问答强制二次确认", () => {
  const result = faqGenerator.run({ shop: SHOP });
  assert.ok(result.faqs.length >= 3);
  const porkFree = result.faqs.find((faq) => faq.question.zh.includes("豬肉"));
  assert.ok(porkFree, "有无猪肉菜品时应生成忌口 FAQ");
  assert.equal(porkFree.requires_confirmation, true);
  const empty = faqGenerator.run({ shop: {} });
  assert.equal(empty.faqs.length, 0);
  assert.equal(empty.warnings.length, 1);
});

test("marketing: brief 提及折扣时不得逐字引用", () => {
  const result = marketing.run({ shop: SHOP, platform: "wechat", brief: "中秋主推禮盒，可以提五折優惠" });
  assert.ok(!result.body.includes("五折"), "未核实的折扣数字不得进入公开文案");
  assert.ok(result.body.includes("以店內公示為準"));
  assert.equal(result.warnings.length, 1);
  assert.ok(result.title.includes("測試茶餐廳"));
});

test("risk-checker: 文字与过敏原勾选矛盾时出旗标，一致时放行", () => {
  const flagged = riskChecker.run({ items: [{ id: "a", name: "花生糖", allergens: {} }] });
  assert.equal(flagged.results[0].flags.length, 1);
  assert.equal(flagged.total_flags, 1);
  const clean = riskChecker.run({ items: [{ id: "b", name: "花生糖", allergens: { nuts: true } }] });
  assert.equal(clean.total_flags, 0);
  assert.ok(flagged.advisory.includes("人工"));
});
