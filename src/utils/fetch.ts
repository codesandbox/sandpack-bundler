import pRetry, { AbortError, Options as RetryOptions } from 'p-retry';

export type RequestInitWithRetry = RequestInit & RetryOptions;

// 408 is timeout
// 429 is too many requests
// 424 is failed dependency
// 499 is client closed connection
// 444 is connection closed without response
// 502 is Bad gateway
// 503 is Service Unavailable
// 504 is Gateway Timeout
// 599 is Network Connect Timeout Error
const ERROR_CODES_TO_RETRY = new Set([408, 429, 424, 499, 444, 502, 503, 504, 599]);
function isRetryableStatus(errorcode: number): boolean {
  return ERROR_CODES_TO_RETRY.has(errorcode);
}

/**
 * Fetches a resource using the provided config and retries if it fails with a network or server availability error
 *
 * @param {RequestInfo} input: request info for fetch
 * @param {RequestInit} init: request options for fetch
 * @param {pRetry.PromiseRetryOptions} retryOptions: Retry configuration
 * @returns {Response}
 */
export function retryFetch(input: RequestInfo, init: RequestInitWithRetry = {}): Promise<Response> {
  const tryFetch = async () => {
    const response = await window.fetch(input, init);
    if (!response.ok && isRetryableStatus(response.status)) {
      throw new AbortError(`[${response.status}]: ${response.statusText}`);
    }
    return response;
  };

  return pRetry<Response>(tryFetch, {
    minTimeout: 250,
    maxTimeout: 1500,
    retries: 5,
    ...init,
  });
}
