import { describe, it, expect, vi } from "vitest";
import { withTimeout, TimeoutError } from "@/lib/with-timeout";

describe("withTimeout", () => {
  it("resolves with the value when the promise settles in time", async () => {
    const result = await withTimeout(Promise.resolve("ok"), 50, "fast");
    expect(result).toBe("ok");
  });

  it("rejects with a TimeoutError when the promise hangs past the budget", async () => {
    vi.useFakeTimers();
    const hang = new Promise<string>(() => {}); // never settles
    const raced = withTimeout(hang, 1000, "db");
    const assertion = expect(raced).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    vi.useRealTimers();
  });

  it("propagates the original rejection (not a timeout) when the promise fails fast", async () => {
    const boom = Promise.reject(new Error("connection refused"));
    await expect(withTimeout(boom, 1000, "db")).rejects.toThrow(
      "connection refused"
    );
  });

  it("includes the label and duration in the timeout message", async () => {
    vi.useFakeTimers();
    const raced = withTimeout(new Promise(() => {}), 500, "flight search");
    const assertion = raced.catch((e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(500);
    expect(await assertion).toBe("flight search timed out after 500ms");
    vi.useRealTimers();
  });
});
