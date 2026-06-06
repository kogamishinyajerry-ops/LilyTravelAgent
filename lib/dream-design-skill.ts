import type { DayPlan, Roadbook } from "@/lib/roadbook-types";

export type DreamMood = "cloud" | "geometry" | "dusk";
export type DreamTemplate = "monument" | "starlake" | "lantern" | "snowfield";

export const dreamMoods: Array<{ id: DreamMood; label: string }> = [
  { id: "cloud", label: "云海" },
  { id: "geometry", label: "几何" },
  { id: "dusk", label: "暮色" },
];

export const dreamTemplates: Array<{
  id: DreamTemplate;
  label: string;
  note: string;
  generationHint: string;
}> = [
  {
    id: "monument",
    label: "纪念碑",
    note: "错视建筑 / 关卡感",
    generationHint: "像纪念碑式梦境地图，每一天是一个安静的建筑关卡。",
  },
  {
    id: "starlake",
    label: "星湖",
    note: "漂浮水面 / 光轨",
    generationHint: "像星湖上的漂浮路线，每一天要有水面、夜光、倒影或轻盈移动感。",
  },
  {
    id: "lantern",
    label: "灯火",
    note: "暖光 / 城市夜游",
    generationHint: "像傍晚灯火慢慢亮起的旅程，每一天要有温暖、街巷、停留感。",
  },
  {
    id: "snowfield",
    label: "雪原",
    note: "留白 / 清冷神殿",
    generationHint: "像清冷雪原里的极简旅行地图，每一天要有留白、远景和安静的仪式感。",
  },
];

export type DreamRouteStop = {
  day: number;
  title: string;
  keywords: string[];
  x: number;
  y: number;
};

export type DreamRoadbookDesign = {
  eyebrow: string;
  titleLines: [string, string];
  inputDestination: string;
  inputMeta: string;
  highlightChips: string[];
  routeStops: DreamRouteStop[];
  routePath: string;
};

const dayCountNames = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

const destinationPrefixes = [
  "中国",
  "云南",
  "四川",
  "贵州",
  "浙江",
  "江苏",
  "广东",
  "广西",
  "福建",
  "海南",
  "山东",
  "山西",
  "陕西",
  "河南",
  "河北",
  "湖南",
  "湖北",
  "安徽",
  "江西",
  "甘肃",
  "青海",
  "辽宁",
  "吉林",
  "黑龙江",
  "内蒙古",
  "新疆",
  "西藏",
  "宁夏",
];

const fallbackRouteY = [46, 32, 43, 30, 45, 34, 48, 36, 44, 33];

export function buildDreamRoadbookDesign(roadbook: Roadbook): DreamRoadbookDesign {
  const days = roadbook.days.length > 0 ? roadbook.days : [];
  const shortDestination = shortenDestination(roadbook.destination || roadbook.title);
  const routeStops = buildRouteStops(days);
  const dayLabel = dayCountNames[days.length] ? `${dayCountNames[days.length]}日` : `${days.length}日`;
  const secondLine = derivePoeticLine(roadbook);

  return {
    eyebrow: `${shortDestination || "旅程"} / Dynamic Roadbook`,
    titleLines: [`${shortDestination || "梦境"}${dayLabel}`, secondLine],
    inputDestination: roadbook.destination || shortDestination || "未命名目的地",
    inputMeta: [roadbook.durationLabel, roadbook.travelerLabel, roadbook.budgetLabel]
      .filter(Boolean)
      .join(" / "),
    highlightChips: roadbook.highlights.slice(0, 3).map((highlight) => compactText(highlight, 8)),
    routeStops,
    routePath: buildRoutePath(routeStops),
  };
}

function buildRouteStops(days: DayPlan[]): DreamRouteStop[] {
  const count = Math.max(days.length, 1);
  const step = count === 1 ? 0 : 76 / (count - 1);

  return days.map((day, index) => {
    const x = count === 1 ? 50 : 12 + step * index;
    const y = fallbackRouteY[index % fallbackRouteY.length];

    return {
      day: day.day,
      title: deriveDayTitle(day),
      keywords: deriveDayKeywords(day),
      x: roundPoint(x),
      y,
    };
  });
}

function buildRoutePath(stops: DreamRouteStop[]) {
  if (stops.length === 0) {
    return "M50 44";
  }

  return stops.slice(1).reduce((path, stop, index) => {
    const previous = stops[index];
    const direction = index % 2 === 0 ? -1 : 1;
    const gap = stop.x - previous.x;
    const c1x = previous.x + gap * 0.42;
    const c2x = stop.x - gap * 0.42;
    const c1y = previous.y + direction * 10;
    const c2y = stop.y - direction * 10;

    return `${path} C${roundPoint(c1x)} ${roundPoint(c1y)}, ${roundPoint(c2x)} ${roundPoint(
      c2y,
    )}, ${stop.x} ${stop.y}`;
  }, `M${stops[0].x} ${stops[0].y}`);
}

function shortenDestination(destination: string) {
  const cleaned = destination
    .replace(/[目的地旅行路线攻略路书\s]/g, "")
    .replace(/[·｜|/／-]/g, "");

  const withoutPrefix = destinationPrefixes.reduce((value, prefix) => {
    return value.startsWith(prefix) ? value.slice(prefix.length) : value;
  }, cleaned);

  return compactText(withoutPrefix || cleaned || destination, 4);
}

function derivePoeticLine(roadbook: Roadbook) {
  const sources = [roadbook.subtitle, roadbook.concept, roadbook.highlights[0], roadbook.summary.routeTheme, "风里"];
  const sourceText = sources.join(" ");
  const scenicKeywords = [
    "风里",
    "洱海",
    "日落",
    "云海",
    "星湖",
    "灯火",
    "雪原",
    "古城",
    "湖光",
    "月色",
    "晨雾",
    "院落",
    "村落",
    "山海",
    "花海",
    "森林",
    "海边",
  ];
  const scenicKeyword = scenicKeywords.find((keyword) => sourceText.includes(keyword));

  if (scenicKeyword) {
    return `走进${scenicKeyword}`;
  }

  const tokens = sources
    .flatMap(splitTokens)
    .map((token) => token.replace(/[体验路线感线计划节奏]/g, ""))
    .filter((token) => token && !/[回头动线规划避免避开少走减少不走从到至]/.test(token));
  const compact = compactText(tokens[0] || "风里", 4);

  return compact ? `走进${compact}` : "走进风里";
}

function deriveDayTitle(day: DayPlan) {
  const source = day.area || day.title || day.stops[0]?.name || `D${day.day}`;
  return compactText(splitTokens(source)[0] || source, 4);
}

function deriveDayKeywords(day: DayPlan) {
  const sources = [
    day.mood,
    day.routeSummary,
    day.photoTips.join("、"),
    day.food.join("、"),
    day.stops.map((stop) => stop.category).join("、"),
  ];

  const keywords = sources.flatMap(splitTokens).map((item) => compactText(item, 5)).filter(Boolean);
  return unique(keywords).slice(0, 3).length > 0 ? unique(keywords).slice(0, 3) : ["慢游", "取景", "留白"];
}

function splitTokens(value: string) {
  return value
    .split(/[、，,。.+＋/／｜|\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function compactText(value: string, maxLength: number) {
  const cleaned = value.replace(/[《》“”"'`]/g, "").trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function roundPoint(value: number) {
  return Number(value.toFixed(1));
}
