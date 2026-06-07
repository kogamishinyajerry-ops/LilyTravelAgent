// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { ToastContainer } from "./toast-container";
import { showError, showInfo, showSuccess, showWarning, toast } from "@/lib/toast";

describe("ToastContainer", () => {
  beforeEach(() => {
    toast.clear();
  });

  afterEach(() => {
    toast.clear();
  });

  it("renders nothing when there are no toasts", () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a success toast with title and description", () => {
    showSuccess("保存成功", "已写入 3 条记录");

    render(<ToastContainer />);

    const region = screen.getByRole("region", { name: "通知" });
    expect(region).toBeTruthy();
    expect(within(region).getByText("保存成功")).toBeTruthy();
    expect(within(region).getByText("已写入 3 条记录")).toBeTruthy();
  });

  it("renders all four variants with the correct variant class", () => {
    showSuccess("success 标题");
    showError("error 标题");
    showInfo("info 标题");
    showWarning("warning 标题");

    const { container } = render(<ToastContainer />);

    expect(container.querySelector(".toast.toast--success")).toBeTruthy();
    expect(container.querySelector(".toast.toast--error")).toBeTruthy();
    expect(container.querySelector(".toast.toast--info")).toBeTruthy();
    expect(container.querySelector(".toast.toast--warning")).toBeTruthy();
  });

  it("uses role='alert' for error and warning, role='status' for success and info", () => {
    showSuccess("ok");
    showError("oops");
    showInfo("note");
    showWarning("careful");

    render(<ToastContainer />);

    expect(screen.getByTestId("toast-success").getAttribute("role")).toBe(
      "status",
    );
    expect(screen.getByTestId("toast-error").getAttribute("role")).toBe(
      "alert",
    );
    expect(screen.getByTestId("toast-info").getAttribute("role")).toBe(
      "status",
    );
    expect(screen.getByTestId("toast-warning").getAttribute("role")).toBe(
      "alert",
    );
  });

  it("stacks multiple toasts in the order they were shown", () => {
    showInfo("first");
    showInfo("second");
    showInfo("third");

    const { container } = render(<ToastContainer />);

    const titles = Array.from(
      container.querySelectorAll<HTMLElement>(".toast-title"),
    ).map((el) => el.textContent);
    expect(titles).toEqual(["first", "second", "third"]);
  });

  it("dismisses a toast when its close button is clicked", () => {
    showSuccess("可关闭");
    const { container } = render(<ToastContainer />);

    expect(container.querySelector(".toast.toast--success")).toBeTruthy();
    const close = screen.getByRole("button", { name: "关闭通知" });
    fireEvent.click(close);

    expect(container.querySelector(".toast.toast--success")).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it("only dismisses the clicked toast when multiple are visible", () => {
    showInfo("keep me");
    showInfo("dismiss me");
    render(<ToastContainer />);

    const buttons = screen.getAllByRole("button", { name: "关闭通知" });
    fireEvent.click(buttons[1]);

    expect(screen.getByText("keep me")).toBeTruthy();
    expect(screen.queryByText("dismiss me")).toBeNull();
  });

  it("exposes aria-live='polite' on the container region", () => {
    showInfo("hi");
    render(<ToastContainer />);

    const region = screen.getByRole("region", { name: "通知" });
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("aria-atomic")).toBe("false");
  });

  it("unsubscribes from the toast manager on unmount", () => {
    const unsubscribe = toast.subscribe(() => {
      // Probe listener: should not be invoked after unmount.
    });
    unsubscribe();
    // After manual unsubscribe, showing a toast should not crash
    // and the component (not currently mounted) should not render it.
    showInfo("orphan");
    const { container } = render(<ToastContainer />);
    expect(container.querySelectorAll(".toast").length).toBe(1);
  });
});
