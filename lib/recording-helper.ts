// Recording helper state machine for the /dream screen.
//
// Goal: when recording a demo video, it is tedious to manually click
// through every template x mood combination. This module exposes a
// pure, DOM-free controller that, given a current wall-clock time,
// tells the caller which template and mood should be displayed and
// whether either of them just changed.
//
// Design constraints:
//   - Pure functions. No React, no DOM, no timers. The caller is
//     responsible for calling `tick(now)` from a setInterval or rAF loop.
//   - All four modes share the same controller shape so the UI can swap
//     modes without rewiring listeners.
//   - `cycle-both` is a nested loop: templates cycle on the inner loop,
//     moods on the outer loop. We stop and report `finished: true` once
//     every (template, mood) pair has been shown once.

import {
  dreamMoods,
  dreamTemplates,
  type DreamMood,
  type DreamTemplate,
} from "./dream-design-skill";

export type RecordingMode =
  | "cycle-templates"
  | "cycle-moods"
  | "cycle-both"
  | "manual";

export type RecordingConfig = {
  mode: RecordingMode;
  /** Milliseconds between automatic advances. Defaults to 4000. */
  stepIntervalMs?: number;
  /** Subset of templates to cycle through. Defaults to all 5. */
  templates?: DreamTemplate[];
  /** Subset of moods to cycle through. Defaults to all 4. */
  moods?: DreamMood[];
};

export type RecordingState = {
  currentTemplateIndex: number;
  currentMoodIndex: number;
  /** Wall-clock ms when the current (template, mood) pair started. */
  currentStepStartMs: number;
  /** How many (template, mood) pairs have been shown in cycle-both. */
  totalSteps: number;
};

export type RecordingTickResult = {
  templateChanged: boolean;
  moodChanged: boolean;
  /**
   * True only for `cycle-both` once every (template, mood) combination
   * has been visited at least once. For other modes it is always false
   * (they loop forever) or, for `manual`, also always false.
   */
  finished: boolean;
};

const DEFAULT_STEP_INTERVAL_MS = 4000;

export type RecordingController = {
  state: RecordingState;
  /**
   * Advance the controller if `stepIntervalMs` has elapsed since the
   * last advance (or since construction). `now` is a wall-clock value
   * in milliseconds (e.g. `performance.now()` or `Date.now()`).
   *
   * Returns which fields changed during this tick. When the interval
   * has not yet elapsed, both change flags are false.
   */
  tick(now: number): RecordingTickResult;
  /** Reset the controller back to the initial template/mood pair. */
  reset(): void;
};

/**
 * Build a controller. The returned `state` object is mutated in place
 * as the controller advances; consumers should read it (and react to
 * the change flags from `tick`) rather than caching it.
 *
 * In `manual` mode the controller never advances on its own — `tick`
 * always reports no changes and `finished` is always false. It is
 * exposed for API symmetry so the UI can keep using the same
 * `tick(now)` loop while a human is clicking through previews.
 */
export function createRecordingController(
  config: RecordingConfig,
): RecordingController {
  const stepIntervalMs = config.stepIntervalMs ?? DEFAULT_STEP_INTERVAL_MS;
  const templates =
    config.templates && config.templates.length > 0
      ? config.templates
      : (dreamTemplates.map((t) => t.id) as DreamTemplate[]);
  const moods =
    config.moods && config.moods.length > 0
      ? config.moods
      : (dreamMoods.map((m) => m.id) as DreamMood[]);
  const mode: RecordingMode = config.mode;

  const state: RecordingState = {
    currentTemplateIndex: 0,
    currentMoodIndex: 0,
    currentStepStartMs: 0,
    totalSteps: 0,
  };

  function advance(): RecordingTickResult {
    if (mode === "manual") {
      return { templateChanged: false, moodChanged: false, finished: false };
    }

    if (mode === "cycle-templates") {
      state.currentTemplateIndex =
        (state.currentTemplateIndex + 1) % templates.length;
      return {
        templateChanged: true,
        moodChanged: false,
        finished: false,
      };
    }

    if (mode === "cycle-moods") {
      state.currentMoodIndex = (state.currentMoodIndex + 1) % moods.length;
      return {
        templateChanged: false,
        moodChanged: true,
        finished: false,
      };
    }

    // mode === "cycle-both": templates cycle on the inner loop, moods
    // on the outer loop. We visit every (template, mood) pair once,
    // then report finished.
    const nextTemplate =
      (state.currentTemplateIndex + 1) % templates.length;
    let nextMood = state.currentMoodIndex;
    let finished = false;

    if (nextTemplate === 0) {
      // Wrapped: time to advance the outer (mood) loop.
      nextMood = (state.currentMoodIndex + 1) % moods.length;
      if (nextMood === 0) {
        // Wrapped both: every combination has been shown once.
        finished = true;
      }
    }

    const templateChanged = nextTemplate !== state.currentTemplateIndex;
    const moodChanged = nextMood !== state.currentMoodIndex;
    state.currentTemplateIndex = nextTemplate;
    state.currentMoodIndex = nextMood;
    state.totalSteps += 1;

    if (finished) {
      // Land on the very first combination so a subsequent reset() /
      // re-run starts cleanly. We still bump totalSteps so callers
      // can assert the counter.
      state.currentTemplateIndex = 0;
      state.currentMoodIndex = 0;
    }

    return { templateChanged, moodChanged, finished };
  }

  return {
    state,
    tick(now: number): RecordingTickResult {
      if (mode === "manual") {
        return { templateChanged: false, moodChanged: false, finished: false };
      }

      if (now - state.currentStepStartMs < stepIntervalMs) {
        return { templateChanged: false, moodChanged: false, finished: false };
      }

      state.currentStepStartMs = now;
      return advance();
    },
    reset(): void {
      state.currentTemplateIndex = 0;
      state.currentMoodIndex = 0;
      state.currentStepStartMs = 0;
      state.totalSteps = 0;
    },
  };
}

/** Convenience: total combinations for a given config (or the default). */
export function getTotalCombinations(
  config: Pick<RecordingConfig, "templates" | "moods">,
): number {
  const templates =
    config.templates && config.templates.length > 0
      ? config.templates
      : (dreamTemplates.map((t) => t.id) as DreamTemplate[]);
  const moods =
    config.moods && config.moods.length > 0
      ? config.moods
      : (dreamMoods.map((m) => m.id) as DreamMood[]);
  return templates.length * moods.length;
}
