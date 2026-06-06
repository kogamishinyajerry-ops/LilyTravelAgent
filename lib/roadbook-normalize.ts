import type { Roadbook } from "@/lib/roadbook-types";

export function normalizeRoadbook(roadbook: Roadbook): Roadbook {
  return {
    ...roadbook,
    disclaimer:
      roadbook.disclaimer ||
      "AI 生成的旅行建议仅用于规划参考。出发前请核验营业时间、票价、预约、交通、天气与安全信息。",
    days: roadbook.days.map((day) => ({
      ...day,
      stops: day.stops.map((stop, index) => ({
        ...stop,
        id: stop.id || `day-${day.day}-stop-${index + 1}`,
        addressHint: stop.addressHint || `${roadbook.destination}${stop.name}`,
        category: stop.category || "other",
      })),
    })),
  };
}
