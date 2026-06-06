import type { GenerationMode } from "@/lib/roadbook-types";

const DEFAULT_MINIMAX_BASE_URL = "https://api.minimaxi.com/v1";

export function buildMiniMaxChatEndpoint() {
  const baseUrl = process.env.MINIMAX_BASE_URL || DEFAULT_MINIMAX_BASE_URL;
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

export function buildMiniMaxImageEndpoint() {
  const baseUrl = process.env.MINIMAX_IMAGE_BASE_URL || process.env.MINIMAX_BASE_URL || DEFAULT_MINIMAX_BASE_URL;
  return `${baseUrl.replace(/\/+$/, "")}/image_generation`;
}

export function buildMiniMaxScenicChatEndpoint() {
  if (process.env.MINIMAX_SCENIC_ENDPOINT) {
    return process.env.MINIMAX_SCENIC_ENDPOINT;
  }

  const baseUrl = process.env.MINIMAX_SCENIC_BASE_URL || process.env.MINIMAX_BASE_URL || DEFAULT_MINIMAX_BASE_URL;
  const path = process.env.MINIMAX_SCENIC_PATH || "text/chatcompletion_v2";

  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function readPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function readGenerationMode(value: unknown): GenerationMode {
  return value === "quality" ? "quality" : "speed";
}

export function resolveMiniMaxModel(mode: GenerationMode) {
  if (mode === "quality") {
    return process.env.MINIMAX_QUALITY_MODEL || process.env.MINIMAX_MODEL || "MiniMax-M3";
  }

  return process.env.MINIMAX_FAST_MODEL || "MiniMax-M2.7-highspeed";
}

export function resolveMiniMaxImageModel() {
  return process.env.MINIMAX_IMAGE_MODEL || "image-01";
}

export function resolveMiniMaxScenicModel() {
  return process.env.MINIMAX_SCENIC_MODEL || process.env.MINIMAX_QUALITY_MODEL || process.env.MINIMAX_MODEL || "MiniMax-M3";
}

export function applyMiniMaxThinking<T extends { model: string; thinking?: { type: string } }>(requestBody: T) {
  if (requestBody.model === "MiniMax-M3") {
    requestBody.thinking = { type: process.env.MINIMAX_THINKING || "disabled" };
  }

  return requestBody;
}
