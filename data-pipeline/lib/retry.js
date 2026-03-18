/**
 * Retry with exponential backoff and jitter.
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options
 * @param {number} options.maxRetries - Max retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Max delay cap in ms (default: 30000)
 * @param {Function} options.shouldRetry - Predicate: (error) => boolean (default: retries transient errors)
 * @param {Function} options.onRetry - Callback: (error, attempt, delay) => void
 * @returns {Promise<*>} Result of fn()
 */
export default async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    shouldRetry = isTransientError,
    onRetry = () => {},
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Exponential backoff: delay = initialDelay * 2^attempt + random jitter
      const exponential = initialDelay * Math.pow(2, attempt);
      const jitter = Math.random() * initialDelay;
      const delay = Math.min(exponential + jitter, maxDelay);

      onRetry(error, attempt + 1, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Determines if an error is transient and worth retrying.
 * Retries: network errors, 5xx, 429 (rate limit), timeouts.
 * Does NOT retry: 4xx (except 429), validation errors, parse errors.
 */
export function isTransientError(error) {
  const message = error.message || "";

  // Network errors
  if (
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ENOTFOUND") ||
    message.includes("fetch failed") ||
    message.includes("network")
  ) {
    return true;
  }

  // HTTP status codes
  const status = error.status || error.statusCode;
  if (status) {
    // 429 Too Many Requests — retry with backoff
    if (status === 429) return true;
    // 5xx Server Error — transient
    if (status >= 500 && status < 600) return true;
    // 4xx Client Error — permanent, don't retry
    if (status >= 400 && status < 500) return false;
  }

  // Timeout errors
  if (message.includes("timeout") || message.includes("Timeout")) {
    return true;
  }

  // Default: don't retry unknown errors
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
