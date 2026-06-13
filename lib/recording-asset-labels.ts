export type RecordingAssetType = "dream" | "studio";

export function getRecordingAssetTypeLabel(type: RecordingAssetType) {
  return type === "studio" ? "Studio QA" : "Dream QA";
}

export function getRecordingAssetUsageHint(type: RecordingAssetType) {
  return type === "studio" ? "讲解画面" : "产品画面";
}
