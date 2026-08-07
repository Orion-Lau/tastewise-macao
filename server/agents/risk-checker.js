// 风险检查 Agent（risk-checker）
// 服务端权威版：对提交审核的菜品做「文字描述 vs 过敏原勾选」矛盾检测。
// 仅供管理员参考（advisory），最终决定必须由人工作出。
// AdminConsole 前端的 riskFlags 是本逻辑的镜像，用于即时 UI 提示。

const RULES = [
  [/花生|杏仁|堅果|坚果|合桃|核桃|腰果/, (a) => a?.nuts || a?.nut, "文字提及堅果，但未勾選含堅果"],
  [/火腿|豬|猪|豚|肉鬆|肉松|叉燒|叉烧|培根|香腸|香肠/, (a) => a?.pork, "文字提及豬肉製品，但未勾選含豬肉"],
  [/蝦|虾|蟹|魚|鱼|海鮮|海鲜|蠔|蚝|帶子|带子/, (a) => a?.seafood, "文字提及海鮮，但未勾選含海鮮"],
  [/牛肉|牛河|牛腩|牛雜|牛杂/, (a) => a?.beef, "文字提及牛肉，但未勾選含牛肉"],
  [/蛋|奶|芝士|忌廉|忌廉|牛油|黃油|黄油/, (a) => a?.eggdairy || a?.egg_dairy, "文字提及蛋奶，但未勾選含蛋奶"],
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
