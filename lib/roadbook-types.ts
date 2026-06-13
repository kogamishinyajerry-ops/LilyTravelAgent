export type TravelBrief = {
  destination: string;
  city: string;
  days: number;
  travelMonth: string;
  travelers: string;
  budget: string;
  pace: string;
  interests: string[];
  mustAvoid: string;
  specialRequests: string;
  tone: string;
};

export type GenerationMode = "speed" | "quality";

export type VisualRenderStrategy = {
  lens: string;
  surface: string;
  motion: string;
};

export type GenerateRoadbookRequest = TravelBrief & {
  generationMode?: GenerationMode;
  visualTemplate?: string;
  visualTemplateLabel?: string;
  renderStrategy?: VisualRenderStrategy;
  directorLens?: string;
  directorLensLabel?: string;
  directorLensPrompt?: string;
};

export type ItineraryStop = {
  id: string;
  name: string;
  time: string;
  category: "view" | "food" | "coffee" | "hotel" | "transport" | "culture" | "shopping" | "other";
  addressHint: string;
  why: string;
  duration: string;
  tip: string;
};

export type DayPlan = {
  day: number;
  title: string;
  area: string;
  mood: string;
  routeSummary: string;
  commuteNote: string;
  budgetNote: string;
  stops: ItineraryStop[];
  food: string[];
  photoTips: string[];
};

export type BudgetLine = {
  label: string;
  amount: string;
  note: string;
};

export type Roadbook = {
  title: string;
  subtitle: string;
  destination: string;
  durationLabel: string;
  travelerLabel: string;
  budgetLabel: string;
  concept: string;
  bestFor: string[];
  highlights: string[];
  summary: {
    routeTheme: string;
    transportPlan: string;
    stayArea: string;
    rhythm: string;
  };
  days: DayPlan[];
  budget: BudgetLine[];
  packing: string[];
  reminders: string[];
  disclaimer: string;
};

export type GeocodePlace = {
  id: string;
  name: string;
  addressHint: string;
  day?: number;
  category?: string;
};

export type GeocodePoint = {
  id: string;
  name: string;
  addressHint: string;
  status: "ok" | "missing_key" | "not_found" | "api_error";
  message?: string;
  lng?: number;
  lat?: number;
  sourceLngGcj?: number;
  sourceLatGcj?: number;
};

export type PreviewAsset = {
  status: "generated" | "fallback";
  source: "minimax-image" | "prompt-only";
  model: string;
  prompt: string;
  aspectRatio: "16:9";
  imageDataUrl?: string;
  imageUrl?: string;
  message?: string;
  cacheStatus?: "hit" | "stored" | "cleared" | "restored" | "cover";
  cacheKey?: string;
  cachedAt?: string;
  historyId?: string;
};

export type ScenicRenderDesign = {
  status: "generated" | "fallback";
  source: "minimax-m3" | "local-fallback";
  model: string;
  destination: string;
  sceneTitle: string;
  terrain: string[];
  architecture: string[];
  waterAndVegetation: string[];
  lighting: string;
  camera: string;
  materialPalette: string[];
  threeJsPlan: string[];
  imagePrompt: string;
  negativePrompt: string[];
  message?: string;
  createdAt?: string;
};

export type PreviewAssetHistoryItem = {
  historyId: string;
  cacheKey: string;
  createdAt: string;
  model: string;
  source: "minimax-image";
  aspectRatio: "16:9";
  destination: string;
  mood?: string;
  template?: string;
  imageDataUrl: string;
  isCover?: boolean;
};

export type ZodFieldIssue = {
  path: string;
  message: string;
  code: string;
};

/**
 * M3 failure categories surfaced by `lib/m3-error-classifier`. Routes
 * include this on the error response so the UI can group and label
 * failures consistently. Optional because legacy clients may omit it.
 */
export type M3ErrorCategory =
  | "network"
  | "timeout"
  | "rate_limit"
  | "server"
  | "auth"
  | "invalid_request"
  | "parse"
  | "schema"
  | "unknown";

export type GenerateRoadbookResponse =
  | {
      ok: true;
      roadbook: Roadbook;
      model: string;
      generationMode: GenerationMode;
      phase?: "preview" | "full";
    }
  | {
      ok: false;
      code: "missing_minimax_key" | "minimax_error" | "parse_error" | "invalid_request";
      message: string;
      /** Classified M3 failure category (see `M3ErrorCategory`). */
      category?: M3ErrorCategory;
      details?: string;
      fieldIssues?: ZodFieldIssue[];
    };

export type GeocodePlacesResponse = {
  ok: true;
  configured: boolean;
  points: GeocodePoint[];
};

export type GeneratePreviewAssetResponse =
  | {
      ok: true;
      asset: PreviewAsset;
    }
  | {
      ok: false;
      code: "missing_minimax_key" | "minimax_error" | "invalid_request";
      message: string;
      category?: M3ErrorCategory;
      details?: string;
      asset?: PreviewAsset;
    };

export type GenerateScenicRenderDesignResponse =
  | {
      ok: true;
      design: ScenicRenderDesign;
    }
  | {
      ok: false;
      code: "missing_minimax_key" | "minimax_error" | "parse_error" | "invalid_request";
      message: string;
      category?: M3ErrorCategory;
      details?: string;
      fieldIssues?: ZodFieldIssue[];
      design?: ScenicRenderDesign;
    };

export type DeletePreviewAssetCacheResponse =
  | {
      ok: true;
      cacheKey: string;
      deleted: boolean;
      message: string;
    }
  | {
      ok: false;
      code: "invalid_request" | "cache_error";
      message: string;
      details?: string;
    };

export type PreviewAssetHistoryResponse =
  | {
      ok: true;
      cacheKey: string;
      coverHistoryId?: string;
      items: PreviewAssetHistoryItem[];
    }
  | {
      ok: false;
      code: "invalid_request" | "history_error";
      message: string;
      details?: string;
    };

export type SetPreviewAssetCoverResponse =
  | {
      ok: true;
      cacheKey: string;
      historyId: string;
      selectedAt: string;
      asset: PreviewAsset;
      message: string;
    }
  | {
      ok: false;
      code: "invalid_request" | "not_found" | "cover_error";
      message: string;
      details?: string;
    };

export type RestorePreviewAssetHistoryResponse =
  | {
      ok: true;
      asset: PreviewAsset;
      message: string;
    }
  | {
      ok: false;
      code: "invalid_request" | "not_found" | "history_error";
      message: string;
      details?: string;
    };
