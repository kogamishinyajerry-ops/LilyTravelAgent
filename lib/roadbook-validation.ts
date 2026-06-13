import { z } from "zod";

export type FormattedZodIssue = {
  path: string;
  message: string;
  code: string;
};

/**
 * Convert a ZodError into a stable, JSON-friendly array of field issues.
 *
 * The path is rendered as a dotted string (e.g. "days.0.stops.2.name") so the
 * frontend can show field-level errors and tests can assert on the shape
 * without dealing with Zod's `PropertyPath` array type.
 */
export function formatZodIssues(error: z.ZodError): FormattedZodIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map((segment) => String(segment)).join("."),
    message: issue.message,
    code: issue.code,
  }));
}

const visualRenderStrategySchema = z.object({
  lens: z.string().min(1).max(80),
  surface: z.string().min(1).max(100),
  motion: z.string().min(1).max(80),
});

export const travelBriefSchema = z.object({
  destination: z.string().min(1).max(80),
  city: z.string().min(1).max(40),
  days: z.coerce.number().int().min(1).max(10),
  travelMonth: z.string().min(1).max(80),
  travelers: z.string().min(1).max(120),
  budget: z.string().min(1).max(120),
  pace: z.string().min(1).max(120),
  interests: z.array(z.string().min(1).max(40)).min(1).max(12),
  mustAvoid: z.string().max(240),
  specialRequests: z.string().max(320),
  tone: z.string().min(1).max(120),
  visualTemplate: z.string().min(1).max(40).optional(),
  visualTemplateLabel: z.string().min(1).max(40).optional(),
  renderStrategy: visualRenderStrategySchema.optional(),
});

const itineraryStopSchema = z.object({
  id: z.string().optional().default(""),
  name: z.string().min(1),
  time: z.string().min(1),
  category: z
    .enum(["view", "food", "coffee", "hotel", "transport", "culture", "shopping", "other"])
    .catch("other"),
  addressHint: z.string().min(1),
  why: z.string().min(1),
  duration: z.string().min(1),
  tip: z.string().min(1),
});

export const roadbookSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  destination: z.string().min(1),
  durationLabel: z.string().min(1),
  travelerLabel: z.string().min(1),
  budgetLabel: z.string().min(1),
  concept: z.string().min(1),
  bestFor: z.array(z.string()).min(2).max(8),
  highlights: z.array(z.string()).min(3).max(8),
  summary: z.object({
    routeTheme: z.string().min(1),
    transportPlan: z.string().min(1),
    stayArea: z.string().min(1),
    rhythm: z.string().min(1),
  }),
  days: z
    .array(
      z.object({
        day: z.coerce.number().int().min(1),
        title: z.string().min(1),
        area: z.string().min(1),
        mood: z.string().min(1),
        routeSummary: z.string().min(1),
        commuteNote: z.string().min(1),
        budgetNote: z.string().min(1),
        stops: z.array(itineraryStopSchema).min(2).max(6),
        food: z.array(z.string()).min(1).max(5),
        photoTips: z.array(z.string()).min(1).max(5),
      }),
    )
    .min(1)
    .max(10),
  budget: z
    .array(
      z.object({
        label: z.string().min(1),
        amount: z.string().min(1),
        note: z.string().min(1),
      }),
    )
    .min(3)
    .max(8),
  packing: z.array(z.string()).min(3).max(10),
  reminders: z.array(z.string()).min(3).max(10),
  disclaimer: z.string().min(1),
});

export const geocodeRequestSchema = z.object({
  city: z.string().min(1).max(60),
  places: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        name: z.string().min(1).max(120),
        addressHint: z.string().max(180).default(""),
        day: z.number().optional(),
        category: z.string().optional(),
      }),
    )
    .min(1)
    .max(40),
});
