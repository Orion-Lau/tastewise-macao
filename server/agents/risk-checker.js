// 風險檢查 Agent（risk-checker）
// 服務端權威版：對提交審覈的菜品做「文字描述 vs 過敏原勾選」矛盾檢測。
// 僅供管理員參考（advisory），最終決定必須由人工作出。
// AdminConsole 前端的 riskFlags 是本邏輯的鏡像，用於即時 UI 提示。

const RULES = [
  [/花生|杏仁|堅果|堅果|合桃|核桃|腰果/, (a) => a?.nuts || a?.nut, "文字提及堅果，但未勾選含堅果"],
  [/火腿|豬|豬|豚|肉鬆|肉鬆|叉燒|叉燒|培根|香腸|香腸/, (a) => a?.pork, "文字提及豬肉製品，但未勾選含豬肉"],
  [/蝦|蝦|蟹|魚|魚|海鮮|海鮮|蠔|蠔|帶子|帶子/, (a) => a?.seafood, "文字提及海鮮，但未勾選含海鮮"],
  [/牛肉|牛河|牛腩|牛雜|牛雜/, (a) => a?.beef, "文字提及牛肉，但未勾選含牛肉"],
  [/蛋|奶|芝士|忌廉|忌廉|牛油|黃油|黃油/, (a) => a?.eggdairy || a?.egg_dairy, "文字提及蛋奶，但未勾選含蛋奶"],
];

function textOf(item) {
  const name = typeof item.name === "string" ? item.name : item.name?.zh || "";
  const desc = typeof item.desc === "string" ? item.desc : item.desc?.zh || item.description || "";
  return `${name} ${desc} ${(item.ingredients || []).join(" ")}`;
}

export function run({ items = [] }) {
  const results = items.map((item) => {
    const text = textOf(item);
    const flags = RULES.filter(([rx, checked]) => rx.test(text) && !checked(item.allergens)).map(([, , message]) => message);
    return { id: item.id, flags };
  });
  return {
    results,
    total_flags: results.reduce((sum, row) => sum + row.flags.length, 0),
    advisory: "自動檢查僅供參考，最終決定必須由人工管理員作出。",
  };
}

