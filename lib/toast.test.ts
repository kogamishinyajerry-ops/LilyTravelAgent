import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  showError,
  showInfo,
  showSuccess,
  showWarning,
  toast,
  ToastManager,
  type Toast,
} from "./toast";

describe("ToastManager", () => {
  let manager: ToastManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new ToastManager();
  });

  afterEach(() => {
    manager.clear();
    vi.useRealTimers();
  });

  it("starts with an empty toast list", () => {
    const listener = vi.fn();
    manager.subscribe(listener);
    expect(listener).toHaveBeenCalledWith([]);
  });

  it("emits the latest snapshot when a toast is shown", () => {
    const listener = vi.fn();
    manager.subscribe(listener);
    listener.mockClear();

    const id = manager.show({ variant: "success", title: "Saved" });

    expect(id).toMatch(/^toast-/);
    const lastCall = listener.mock.calls.at(-1)?.[0] as Toast[] | undefined;
    expect(lastCall).toBeDefined();
    expect(lastCall).toHaveLength(1);
    expect(lastCall?.[0]).toMatchObject({
      id,
      variant: "success",
      title: "Saved",
      durationMs: 4000,
    });
  });

  it("stacks multiple toasts in order", () => {
    const states: Toast[][] = [];
    manager.subscribe((next) => states.push([...next]));

    manager.show({ variant: "info", title: "One" });
    manager.show({ variant: "warning", title: "Two" });
    manager.show({ variant: "error", title: "Three" });

    const last = states.at(-1) ?? [];
    expect(last.map((toast) => toast.title)).toEqual(["One", "Two", "Three"]);
  });

  it("dismisses a specific toast by id", () => {
    const states: Toast[][] = [];
    manager.subscribe((next) => states.push([...next]));

    const first = manager.show({ variant: "success", title: "First" });
    manager.show({ variant: "info", title: "Second" });
    manager.dismiss(first);

    const last = states.at(-1) ?? [];
    expect(last.map((toast) => toast.title)).toEqual(["Second"]);
  });

  it("dismisses is a no-op when the id is unknown", () => {
    const listener = vi.fn();
    manager.subscribe(listener);
    listener.mockClear();

    manager.dismiss("not-a-real-id");

    // The listener should not be invoked because the list didn't change.
    expect(listener).not.toHaveBeenCalled();
  });

  it("auto-dismisses after durationMs using the default of 4000ms", () => {
    const states: Toast[][] = [];
    manager.subscribe((next) => states.push([...next]));

    manager.show({ variant: "info", title: "Auto" });

    expect((states.at(-1) ?? []).map((toast) => toast.title)).toEqual(["Auto"]);

    vi.advanceTimersByTime(4000);

    expect((states.at(-1) ?? []).map((toast) => toast.title)).toEqual([]);
  });

  it("auto-dismisses after a custom duration", () => {
    const states: Toast[][] = [];
    manager.subscribe((next) => states.push([...next]));

    manager.show({ variant: "warning", title: "Custom", durationMs: 1000 });

    vi.advanceTimersByTime(999);
    expect((states.at(-1) ?? []).map((toast) => toast.title)).toEqual(["Custom"]);

    vi.advanceTimersByTime(2);
    expect((states.at(-1) ?? []).map((toast) => toast.title)).toEqual([]);
  });

  it("does not auto-dismiss when durationMs is 0", () => {
    const states: Toast[][] = [];
    manager.subscribe((next) => states.push([...next]));

    manager.show({ variant: "error", title: "Sticky", durationMs: 0 });

    vi.advanceTimersByTime(60_000);

    expect((states.at(-1) ?? []).map((toast) => toast.title)).toEqual(["Sticky"]);
  });

  it("subscribe returns an unsubscribe function", () => {
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);
    listener.mockClear();

    unsubscribe();
    manager.show({ variant: "info", title: "After unsub" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("clear removes all toasts and cancels their timers", () => {
    const states: Toast[][] = [];
    manager.subscribe((next) => states.push([...next]));

    manager.show({ variant: "info", title: "A", durationMs: 500 });
    manager.show({ variant: "info", title: "B", durationMs: 500 });

    manager.clear();
    expect((states.at(-1) ?? []).map((toast) => toast.title)).toEqual([]);

    // After the original timer fires, the listener should not be re-invoked
    // because clear() cancelled the pending timers.
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);
    listener.mockClear();
    vi.advanceTimersByTime(1000);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("dismissing a toast cancels its auto-dismiss timer", () => {
    const states: Toast[][] = [];
    manager.subscribe((next) => states.push([...next]));

    const id = manager.show({ variant: "success", title: "Manual", durationMs: 1000 });
    manager.dismiss(id);

    // Advancing time past the original duration should not re-emit.
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);
    listener.mockClear();
    vi.advanceTimersByTime(2000);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("uses the provided id when one is passed to show", () => {
    const states: Toast[][] = [];
    manager.subscribe((next) => states.push([...next]));

    manager.show({ id: "custom-id", variant: "info", title: "With id" });

    const last = states.at(-1) ?? [];
    expect(last[0]?.id).toBe("custom-id");
  });
});

describe("showSuccess / showError / showInfo / showWarning", () => {
  beforeEach(() => {
    toast.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    toast.clear();
    vi.useRealTimers();
  });

  it("showSuccess emits a success toast", () => {
    const states: Toast[][] = [];
    toast.subscribe((next) => states.push([...next]));

    showSuccess("路书已生成", "共 4 天");

    const last = states.at(-1) ?? [];
    expect(last[0]).toMatchObject({
      variant: "success",
      title: "路书已生成",
      description: "共 4 天",
    });
  });

  it("showError emits an error toast", () => {
    const states: Toast[][] = [];
    toast.subscribe((next) => states.push([...next]));

    showError("网络异常", "请稍后重试");

    const last = states.at(-1) ?? [];
    expect(last[0]).toMatchObject({
      variant: "error",
      title: "网络异常",
      description: "请稍后重试",
    });
  });

  it("showInfo emits an info toast", () => {
    const states: Toast[][] = [];
    toast.subscribe((next) => states.push([...next]));

    showInfo("录制开始");

    const last = states.at(-1) ?? [];
    expect(last[0]).toMatchObject({
      variant: "info",
      title: "录制开始",
    });
  });

  it("showWarning emits a warning toast", () => {
    const states: Toast[][] = [];
    toast.subscribe((next) => states.push([...next]));

    showWarning("Token 即将过期");

    const last = states.at(-1) ?? [];
    expect(last[0]).toMatchObject({
      variant: "warning",
      title: "Token 即将过期",
    });
  });

  it("helpers work without a description", () => {
    const states: Toast[][] = [];
    toast.subscribe((next) => states.push([...next]));

    showSuccess("完成");

    const last = states.at(-1) ?? [];
    expect(last[0]?.description).toBeUndefined();
  });
});
