// Test-only OpenRouter mock: never sends a billable API request.
const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);
AbortSignal.timeout = () => nativeTimeout(80);
globalThis.fetch = async (_url, options = {}) => {
  const signal = options.signal;
  return new Promise((_resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
};
