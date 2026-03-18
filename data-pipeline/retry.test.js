import { describe, it, expect, vi } from "vitest";
import retry, { isTransientError } from "./lib/retry.js";

describe("retry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient error then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValue("recovered");

    const result = await retry(fn, { initialDelay: 1 });
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries up to maxRetries then throws", async () => {
    const error = new Error("fetch failed");
    const fn = vi.fn().mockRejectedValue(error);

    await expect(retry(fn, { maxRetries: 2, initialDelay: 1 })).rejects.toThrow("fetch failed");
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("does not retry non-transient errors", async () => {
    const error = Object.assign(new Error("Not Found"), { status: 404 });
    const fn = vi.fn().mockRejectedValue(error);

    await expect(retry(fn, { initialDelay: 1 })).rejects.toThrow("Not Found");
    expect(fn).toHaveBeenCalledTimes(1); // no retry
  });

  it("retries 429 rate limit errors", async () => {
    const rateLimited = Object.assign(new Error("Too Many Requests"), {
      status: 429,
    });
    const fn = vi.fn().mockRejectedValueOnce(rateLimited).mockResolvedValue("ok");

    const result = await retry(fn, { initialDelay: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries 500 server errors", async () => {
    const serverErr = Object.assign(new Error("Internal Server Error"), {
      status: 500,
    });
    const fn = vi.fn().mockRejectedValueOnce(serverErr).mockResolvedValue("ok");

    const result = await retry(fn, { initialDelay: 1 });
    expect(result).toBe("ok");
  });

  it("calls onRetry callback with attempt and delay", async () => {
    const onRetry = vi.fn();
    const fn = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValue("ok");

    await retry(fn, { initialDelay: 1, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0][1]).toBe(1); // attempt number
    expect(typeof onRetry.mock.calls[0][2]).toBe("number"); // delay
  });

  it("respects custom shouldRetry predicate", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("custom error"));
    const shouldRetry = vi.fn().mockReturnValue(false);

    await expect(retry(fn, { initialDelay: 1, shouldRetry })).rejects.toThrow("custom error");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });
});

describe("isTransientError", () => {
  it("returns true for network errors", () => {
    expect(isTransientError(new Error("ECONNRESET"))).toBe(true);
    expect(isTransientError(new Error("ETIMEDOUT"))).toBe(true);
    expect(isTransientError(new Error("fetch failed"))).toBe(true);
  });

  it("returns true for 5xx errors", () => {
    expect(isTransientError(Object.assign(new Error(), { status: 500 }))).toBe(true);
    expect(isTransientError(Object.assign(new Error(), { status: 503 }))).toBe(true);
  });

  it("returns true for 429 rate limit", () => {
    expect(isTransientError(Object.assign(new Error(), { status: 429 }))).toBe(true);
  });

  it("returns false for 4xx client errors", () => {
    expect(isTransientError(Object.assign(new Error(), { status: 400 }))).toBe(false);
    expect(isTransientError(Object.assign(new Error(), { status: 401 }))).toBe(false);
    expect(isTransientError(Object.assign(new Error(), { status: 404 }))).toBe(false);
  });

  it("returns true for timeout errors", () => {
    expect(isTransientError(new Error("Request timeout"))).toBe(true);
    expect(isTransientError(new Error("Timeout exceeded"))).toBe(true);
  });

  it("returns false for unknown errors", () => {
    expect(isTransientError(new Error("validation failed"))).toBe(false);
    expect(isTransientError(new Error("parse error"))).toBe(false);
  });
});
