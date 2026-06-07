export type ToastVariant = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs?: number;
};

export type ToastListener = (toasts: Toast[]) => void;

const DEFAULT_DURATION_MS = 4000;

let toastCounter = 0;
function generateId(): string {
  toastCounter += 1;
  return `toast-${Date.now().toString(36)}-${toastCounter}`;
}

export class ToastManager {
  private toasts: Toast[] = [];
  private listeners = new Set<ToastListener>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    // Push the current state immediately so subscribers don't have to wait
    // for the first show/dismiss to learn what's already on screen.
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  show(toast: Omit<Toast, "id"> & { id?: string }): string {
    const id = toast.id ?? generateId();
    const duration = toast.durationMs ?? DEFAULT_DURATION_MS;
    const next: Toast = {
      id,
      variant: toast.variant,
      title: toast.title,
      ...(toast.description !== undefined ? { description: toast.description } : {}),
      durationMs: duration,
    };

    this.toasts = [...this.toasts, next];
    this.emit();

    if (duration > 0) {
      const handle = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      this.timers.set(id, handle);
    }

    return id;
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    const next = this.toasts.filter((toast) => toast.id !== id);
    if (next.length !== this.toasts.length) {
      this.toasts = next;
      this.emit();
    }
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    if (this.toasts.length > 0) {
      this.toasts = [];
      this.emit();
    }
  }

  private emit(): void {
    const snapshot = [...this.toasts];
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export const toast = new ToastManager();

export function showSuccess(title: string, description?: string): string {
  return toast.show({
    variant: "success",
    title,
    ...(description !== undefined ? { description } : {}),
  });
}

export function showError(title: string, description?: string): string {
  return toast.show({
    variant: "error",
    title,
    ...(description !== undefined ? { description } : {}),
  });
}

export function showInfo(title: string, description?: string): string {
  return toast.show({
    variant: "info",
    title,
    ...(description !== undefined ? { description } : {}),
  });
}

export function showWarning(title: string, description?: string): string {
  return toast.show({
    variant: "warning",
    title,
    ...(description !== undefined ? { description } : {}),
  });
}
