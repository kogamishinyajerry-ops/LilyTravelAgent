export type RecordingAssetType = "dream" | "studio" | "bridge";

export function getRecordingAssetTypeLabel(type: RecordingAssetType) {
  if (type === "studio") {
    return "Studio QA";
  }

  if (type === "bridge") {
    return "Bridge QA";
  }

  return "Dream QA";
}

export function getRecordingAssetUsageHint(type: RecordingAssetType) {
  if (type === "studio") {
    return "讲解画面";
  }

  if (type === "bridge") {
    return "桥接验证";
  }

  return "产品画面";
}
