export const SAMPLE_SHOPS = [
  {
    id: "san-son-heng",
    accent: "clay",
    monogram: "茶",
    name: { zh: "新順興茶餐廳", en: "San Son Heng Café", pt: "Café San Son Heng", ja: "サンソンヘン茶餐廳" },
    type: { zh: "老字號茶餐廳", en: "Neighbourhood café", pt: "Café de bairro", ja: "老舗茶餐廳" },
    district: { zh: "十月初五街", en: "Rua de Cinco de Outubro", pt: "Rua de Cinco de Outubro", ja: "十月初五日街" },
    address: "十月初五日街 42 號地下",
    hours: "07:30–18:00 · 週三休息",
    payments: ["現金", "澳門通", "支付寶", "微信支付"],
    rating: 4.8,
    priceLevel: "$$",
    featured: "portuguese-chicken",
    story: {
      zh: "1972 年開業的街坊茶餐廳。豬扒包即叫即炸，乾炒牛河講究鑊氣；熟客坐下來，店員往往已知道他要哪一杯奶茶。",
      en: "A neighbourhood cha chaan teng since 1972, known for made-to-order pork chop buns, smoky beef ho fun and regulars whose tea order needs no asking.",
      pt: "Um café de bairro desde 1972, conhecido pelas bifanas feitas na hora e pelo chow fun de vaca.",
      ja: "1972年創業。揚げたてのポークチョップバーガーと香ばしい牛肉河粉で知られる街の茶餐廳です。",
    },
    faqs: [
      { id: "faq-1", q: { zh: "有甚麼招牌推介？", en: "What are your signatures?", pt: "Quais são as especialidades?", ja: "おすすめは何ですか？" }, a: { zh: "乾炒牛河、葡國雞飯和即叫即炸的豬扒包最受歡迎。", en: "Beef ho fun, Portuguese chicken rice and the made-to-order pork chop bun are the house signatures.", pt: "Recomendamos o chow fun de vaca, a galinha à portuguesa e o pão com costeleta.", ja: "牛肉河粉、ポルトガル風チキンライス、ポークチョップバーガーが人気です。" } },
      { id: "faq-2", q: { zh: "可以用支付寶嗎？", en: "Do you accept Alipay?", pt: "Aceitam Alipay?", ja: "Alipayは使えますか？" }, a: { zh: "可以。本店接受現金、澳門通、支付寶及微信支付。", en: "Yes. We accept cash, Macau Pass, Alipay and WeChat Pay.", pt: "Sim. Aceitamos dinheiro, Macau Pass, Alipay e WeChat Pay.", ja: "はい。現金、マカオパス、Alipay、WeChat Payをご利用いただけます。" } },
      { id: "faq-3", requires_confirmation: true, q: { zh: "有不含豬肉的選擇嗎？", en: "Any pork-free options?", pt: "Há opções sem porco?", ja: "豚肉なしの料理は？" }, a: { zh: "乾炒牛河、葡國雞飯和奶茶等不含豬肉；嚴格忌口請落單前再向店員確認。", en: "Beef ho fun, Portuguese chicken rice and milk tea contain no pork; please confirm strict dietary needs with staff.", pt: "O chow fun, a galinha e o chá com leite não contêm porco; confirme restrições rigorosas.", ja: "牛肉河粉、チキンライス、ミルクティーは豚肉不使用です。厳格な制限はスタッフにご確認ください。" } },
    ],
    dishes: [
      {
        id: "portuguese-chicken", category: "main", price: 58, featured: true,
        name: { zh: "葡國雞飯", en: "Portuguese Chicken Rice", pt: "Galinha à portuguesa", ja: "ポルトガル風チキンライス" },
        desc: { zh: "椰香咖喱焗雞配薯仔，是澳門土生菜的經典味道。", en: "Baked chicken in coconut curry with potato — a Macanese classic.", pt: "Frango assado em caril de coco com batata.", ja: "ココナッツカレーで焼いた鶏肉とじゃがいも。" },
        recommendation_reason: { zh: "想認識澳門土生菜，這是最直接的一道。", en: "The clearest introduction to classic Macanese comfort food." },
        owner_note: { zh: "咖喱微辣，可按需要減少醬汁。", en: "Mildly spicy; ask for less sauce if preferred." },
        tags: ["招牌", "含蛋奶"], ingredients: ["雞肉", "椰奶", "咖喱", "薯仔"], symbol: "葡",
      },
      {
        id: "beef-hofun", category: "main", price: 48, featured: true,
        name: { zh: "乾炒牛河", en: "Stir-fried Beef Ho Fun", pt: "Chow fun de vaca", ja: "牛肉入り炒め河粉" },
        desc: { zh: "大火豉油乾炒，河粉乾身，牛肉嫩滑。", en: "High-heat wok-fried rice noodles with tender beef.", pt: "Massa de arroz salteada em lume forte com vaca.", ja: "強火で香ばしく炒めた平打ち米麺と牛肉。" },
        tags: ["招牌", "不含豬肉"], ingredients: ["牛肉", "河粉", "芽菜", "洋蔥"], symbol: "鑊",
      },
      {
        id: "pork-bun", category: "snack", price: 32,
        name: { zh: "招牌豬扒包", en: "Pork Chop Bun", pt: "Pão com costeleta", ja: "ポークチョップバーガー" },
        desc: { zh: "豬扒即叫即炸，外脆內鬆。", en: "Crisp fried pork chop in a warm crusty bun.", pt: "Costeleta de porco frita na hora em pão estaladiço.", ja: "揚げたての豚肉を香ばしいパンに。" },
        tags: ["人氣", "含豬肉"], ingredients: ["豬扒", "麵包"], symbol: "包",
      },
      {
        id: "french-toast", category: "snack", price: 28,
        name: { zh: "花生醬西多士", en: "Peanut French Toast", pt: "Torrada francesa com amendoim", ja: "ピーナッツフレンチトースト" },
        desc: { zh: "花生醬夾心，配煉奶和牛油。", en: "Peanut butter centre with condensed milk and butter.", pt: "Com manteiga de amendoim, leite condensado e manteiga.", ja: "ピーナッツバター、練乳、バターを添えて。" },
        tags: ["含花生", "含蛋奶"], ingredients: ["麵包", "花生醬", "雞蛋", "煉奶"], symbol: "西",
      },
      {
        id: "milk-tea", category: "drink", price: 20,
        name: { zh: "絲襪奶茶", en: "Silk-stocking Milk Tea", pt: "Chá com leite", ja: "香港式ミルクティー" },
        desc: { zh: "茶味厚、奶香順，熱飲或凍飲。", en: "Strong black tea, silky and fragrant.", pt: "Chá preto intenso, suave e aromático.", ja: "濃い紅茶とまろやかなミルク。" },
        tags: ["含奶"], ingredients: ["紅茶", "淡奶"], symbol: "奶",
      },
    ],
  },
  {
    id: "veng-kei",
    accent: "gold",
    monogram: "餅",
    name: { zh: "榮記餅家", en: "Veng Kei Pastelaria", pt: "Pastelaria Veng Kei", ja: "栄記餅家" },
    type: { zh: "三代手信餅家", en: "Heritage bakery", pt: "Pastelaria tradicional", ja: "老舗菓子店" },
    district: { zh: "福隆新街", en: "Rua da Felicidade", pt: "Rua da Felicidade", ja: "福隆新街" },
    address: "福隆新街 18 號",
    hours: "10:00–19:30",
    payments: ["現金", "澳門通", "支付寶", "微信支付"],
    rating: 4.7,
    priceLevel: "$",
    featured: "almond-cookie",
    story: {
      zh: "三代人在福隆新街做餅。木模上的「榮」字已磨得發亮，每一盒杏仁餅仍是早上現烤。",
      en: "Three generations baking on Rua da Felicidade. Every box of almond cookies still comes from the oven that morning.",
      pt: "Três gerações a fazer bolos na Rua da Felicidade, ainda hoje assados todas as manhãs.",
      ja: "福隆新街で三代続く菓子店。アーモンドクッキーは今も毎朝焼き上げます。",
    },
    dishes: [
      {
        id: "almond-cookie", category: "gift", price: 45, featured: true,
        name: { zh: "炭燒杏仁餅", en: "Charcoal Almond Cookie", pt: "Biscoito de amêndoa", ja: "炭焼きアーモンドクッキー" },
        desc: { zh: "入口鬆化，杏仁香清楚；每日小批出爐。", en: "Crumbly, fragrant and baked in small batches daily.", pt: "Crocante, aromático e assado diariamente.", ja: "ほろりと崩れ、香ばしい。毎日少量ずつ焼き上げます。" },
        tags: ["招牌", "送禮", "含堅果"], ingredients: ["杏仁", "綠豆粉", "植物油"], symbol: "杏",
      },
      {
        id: "egg-roll", category: "gift", price: 38,
        name: { zh: "手工蛋卷", en: "Handmade Egg Roll", pt: "Rolo de ovo artesanal", ja: "手作りエッグロール" },
        desc: { zh: "薄脆蛋香，獨立包裝方便送禮。", en: "Light, crisp and individually wrapped for gifting.", pt: "Leve, crocante e embalado individualmente.", ja: "薄くてサクサク。個包装でお土産にも。" },
        tags: ["送禮", "含蛋奶"], ingredients: ["雞蛋", "牛油", "麵粉"], symbol: "卷",
      },
      {
        id: "ginger-candy", category: "gift", price: 30,
        name: { zh: "老薑軟糖", en: "Soft Ginger Candy", pt: "Rebuçado de gengibre", ja: "生姜ソフトキャンディ" },
        desc: { zh: "辛香回甘，適合旅途隨身帶。", en: "Warm ginger heat with a clean, sweet finish.", pt: "Picante de gengibre com final doce.", ja: "生姜の辛さとやさしい甘み。" },
        tags: ["素食可", "送禮"], ingredients: ["老薑", "砂糖", "麥芽糖"], symbol: "薑",
      },
    ],
  },
  {
    id: "ervanarios-cafe",
    accent: "blue",
    monogram: "啡",
    name: { zh: "關前咖啡室", en: "Café Ervanários", pt: "Café Ervanários", ja: "エルヴァナリオス・カフェ" },
    type: { zh: "舊藥材舖咖啡室", en: "Old-town coffee room", pt: "Café no bairro antigo", ja: "旧市街のカフェ" },
    district: { zh: "關前正街", en: "Rua dos Ervanários", pt: "Rua dos Ervanários", ja: "関前正街" },
    address: "關前正街 31 號",
    hours: "08:30–18:00",
    payments: ["現金", "澳門通", "信用卡", "支付寶"],
    rating: 4.6,
    priceLevel: "$$",
    featured: "pastel-nata",
    story: {
      zh: "老藥材舖改成的咖啡室，留下整面百子櫃。葡撻約每二十分鐘出爐，窗邊仍看得見舊城招牌。",
      en: "A café inside an old herbal medicine shop, with the wall of drawers preserved and fresh pastéis de nata every twenty minutes.",
      pt: "Um café numa antiga ervanária, com as gavetas preservadas e pastéis de nata acabados de sair do forno.",
      ja: "漢方薬店を改装したカフェ。薬棚を残し、エッグタルトは約20分ごとに焼き上がります。",
    },
    dishes: [
      {
        id: "pastel-nata", category: "dessert", price: 12, featured: true,
        name: { zh: "葡式蛋撻", en: "Pastel de Nata", pt: "Pastel de nata", ja: "エッグタルト" },
        desc: { zh: "焦糖斑點酥皮蛋撻，約每二十分鐘新鮮出爐。", en: "Caramelised custard in crisp pastry, baked throughout the day.", pt: "Creme caramelizado em massa folhada, sempre fresco.", ja: "香ばしいカスタードとサクサクのパイ生地。" },
        tags: ["招牌", "含蛋奶"], ingredients: ["雞蛋", "牛奶", "酥皮"], symbol: "撻",
      },
      {
        id: "pour-over", category: "drink", price: 48,
        name: { zh: "手沖單品咖啡", en: "Pour-over Coffee", pt: "Café de filtro", ja: "ハンドドリップコーヒー" },
        desc: { zh: "每兩週小批烘焙，風味依當日豆單。", en: "Small-batch roasted; origin changes with the weekly board.", pt: "Torra em pequenos lotes; a origem muda semanalmente.", ja: "少量焙煎。豆は週替わりです。" },
        tags: ["純素"], ingredients: ["咖啡豆", "水"], symbol: "沖",
      },
      {
        id: "oat-latte", category: "drink", price: 42,
        name: { zh: "燕麥奶拿鐵", en: "Oat Latte", pt: "Latte de aveia", ja: "オーツラテ" },
        desc: { zh: "堅果調咖啡配燕麥奶，不含牛奶。", en: "Nutty espresso with oat milk; dairy-free.", pt: "Espresso com bebida de aveia, sem leite.", ja: "香ばしいエスプレッソとオーツミルク。" },
        tags: ["純素", "不含奶"], ingredients: ["咖啡豆", "燕麥奶"], symbol: "燕",
      },
    ],
  },
];

export const CATEGORIES = [
  { id: "all", zh: "全部", en: "All", pt: "Tudo", ja: "すべて" },
  { id: "main", zh: "主食", en: "Mains", pt: "Pratos", ja: "主食" },
  { id: "snack", zh: "小食", en: "Snacks", pt: "Petiscos", ja: "軽食" },
  { id: "drink", zh: "飲品", en: "Drinks", pt: "Bebidas", ja: "飲み物" },
  { id: "dessert", zh: "甜品", en: "Desserts", pt: "Sobremesas", ja: "デザート" },
  { id: "gift", zh: "手信", en: "Gifts", pt: "Lembranças", ja: "お土産" },
];

export function localize(value, lang = "zh") {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.en || value.zh || Object.values(value)[0] || "";
}

