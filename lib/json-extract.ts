export function extractJsonObject(input: string): unknown {
  const withoutThink = input.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const withoutFence = withoutThink
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON object found in model response.");
    }
    return JSON.parse(withoutFence.slice(start, end + 1));
  }
}
